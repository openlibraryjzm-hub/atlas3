/**
 * RadialMenuStandalone.jsx
 * 
 * Standalone, exportable menu component - renders ONLY the menu canvas
 * No windows, modals, or extra UI - just the menu itself
 * 
 * USAGE:
 * 1. Copy this file to your project
 * 2. Install: npm install gsap perspective-transform
 * 3. Import and use:
 *    import RadialMenuStandalone from './RadialMenuStandalone'
 *    <RadialMenuStandalone 
 *      dictionaryConfig={dictionaryJson} 
 *      containerConfig={containerJson} 
 *    />
 * 
 * PROPS:
 * - dictionaryConfig: Dictionary JSON object (or path to load from)
 * - containerConfig: Container configuration JSON object
 * - backgroundColor: Optional background color (default: transparent)
 */

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { gsap } from 'gsap'
// PerspectiveTransform disabled due to initialization issues
// import PerspectiveTransform from 'perspective-transform'

// ============================================================================
// TYPES
// ============================================================================

const RadialMenuStandalone = ({ 
  dictionaryConfig, 
  containerConfig,
  backgroundColor = 'transparent'
}) => {
  const canvasRef = useRef(null)
  const canvasContainerRef = useRef(null)
  
  // State
  const [containers, setContainers] = useState(containerConfig?.containers || [])
  const [bundles, setBundles] = useState(containerConfig?.bundles || [])
  const [contentElements, setContentElements] = useState([])
  const [dictionary, setDictionary] = useState({})
  const [isAnimating, setIsAnimating] = useState(false)
  const viewportBox = containerConfig?.viewportBox || null
  
  // Extract items from bundleItems config if available, otherwise generate
  const bundleItems = containerConfig?.bundleItems || {}
  const visibleStartIndex = containerConfig?.visibleStartIndex || {}
  
  // Get items for bundle-1 from config, or generate fallback
  const items = useMemo(() => {
    const bundle1Items = bundleItems['bundle-1']
    if (bundle1Items && bundle1Items.items && bundle1Items.items.length > 0) {
      // Use items from config
      return bundle1Items.items.map(item => item.text || item.id)
    }
    // Fallback: generate items if not in config
    return Array.from({ length: 99 }, (_, i) => `item${i + 1}`)
  }, [bundleItems])
  
  // Refs for animation management
  const animationRefs = useRef({})
  const contentElementsRef = useRef([])
  const scrollThrottleRef = useRef(null)
  
  // Track startIndex for circular scrolling (bundle-1 only)
  // startIndex is the index in items array of the first visible item (top position)
  // Initialize from visibleStartIndex config if available
  const startIndexRef = useRef(visibleStartIndex['bundle-1'] || 0)
  
  // Calculate canvas size from viewport box OR container bounds
  const calculateCanvasSize = useCallback(() => {
    if (viewportBox) {
      // Use viewport box dimensions
      return {
        width: viewportBox.width,
        height: viewportBox.height
      }
    }
    
    // Otherwise, calculate from all container points
    if (containers.length === 0) {
      return { width: 800, height: 600 } // Default fallback
    }
    
    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity
    
    containers.forEach(container => {
      container.points.forEach(point => {
        minX = Math.min(minX, point.x)
        minY = Math.min(minY, point.y)
        maxX = Math.max(maxX, point.x)
        maxY = Math.max(maxY, point.y)
      })
    })
    
    // Add padding
    const padding = 20
    return {
      width: Math.max(400, maxX - minX + padding * 2),
      height: Math.max(300, maxY - minY + padding * 2)
    }
  }, [containers, viewportBox])
  
  const canvasSize = calculateCanvasSize()
  const canvasWidth = canvasSize.width
  const canvasHeight = canvasSize.height
  
  // Calculate offset if using viewport box (to crop to viewport)
  const canvasOffset = viewportBox ? {
    x: -viewportBox.x,
    y: -viewportBox.y
  } : { x: 0, y: 0 }
  
  // Keep ref in sync with state
  useEffect(() => {
    contentElementsRef.current = contentElements
  }, [contentElements])

  // Load dictionary
  useEffect(() => {
    if (typeof dictionaryConfig === 'string') {
      // Load from URL
      fetch(dictionaryConfig)
        .then(res => res.json())
        .then(data => {
          const { description, unitSize, ...letters } = data
          setDictionary(letters)
        })
        .catch(err => console.error('Failed to load dictionary:', err))
    } else if (dictionaryConfig) {
      // Use provided object
      const { description, unitSize, ...letters } = dictionaryConfig
      setDictionary(letters)
    }
  }, [dictionaryConfig])

  // Track initialization to prevent re-initialization during animations
  const initializationKeyRef = useRef(null)
  const isInitializedRef = useRef(false)
  
  // Initialize content elements from config
  useEffect(() => {
    if (containers.length === 0 || bundles.length === 0) return
    
    // Create a stable key from containers/bundles/offset to detect actual changes
    const currentKey = JSON.stringify({
      containerIds: containers.map(c => c.id),
      bundleIds: bundles.map(b => b.id),
      offsetX: canvasOffset.x,
      offsetY: canvasOffset.y
    })
    
    // Skip if we already initialized with this exact configuration
    if (initializationKeyRef.current === currentKey && isInitializedRef.current) {
      return
    }
    
    initializationKeyRef.current = currentKey
    isInitializedRef.current = true
    
    // Reset startIndexRef from visibleStartIndex config (for bundle-1 only, legacy support)
    if (visibleStartIndex['bundle-1'] !== undefined) {
      startIndexRef.current = visibleStartIndex['bundle-1']
    }
    
    const allNewContentElements = []
    
    bundles.forEach(bundle => {
      const bundleContainers = containers.filter(c => c.bundleId === bundle.id)
      let normalContainers = bundleContainers.filter(c => c.teleportType === null)
      
      // Sort containers by vertical position (Y coordinate) - top to bottom
      // Calculate average Y coordinate of each container's points for sorting
      normalContainers = normalContainers.sort((a, b) => {
        const avgY_a = a.points.reduce((sum, p) => sum + p.y, 0) / a.points.length
        const avgY_b = b.points.reduce((sum, p) => sum + p.y, 0) / b.points.length
        return avgY_a - avgY_b
      })
      
      // Get bundle items data if available
      const bundleItemsData = bundleItems[bundle.id]
      const bundleItemsList = bundleItemsData?.items || []
      
      // Check if this bundle is in scrolling list mode (has items and more items than containers)
      const useScrollingList = bundleItemsList.length > 0 && bundleItemsList.length > normalContainers.length
      
      if (useScrollingList) {
        // SCROLLING LIST MODE: Create elements for visible items only
        // Each element gets its actual itemIndex from the items array
        const numVisible = normalContainers.length
        const startIndex = visibleStartIndex[bundle.id] || 0
        
        // Create visible elements
        for (let i = 0; i < numVisible; i++) {
          const container = normalContainers[i]
          const itemIndex = (startIndex + i) % bundleItemsList.length
          const item = bundleItemsList[itemIndex]
          
          if (item && container) {
            allNewContentElements.push({
              id: `content-item-${item.id || itemIndex}`,
              bundleId: bundle.id,
              itemIndex: itemIndex,
              containerId: container.id,
              text: item.text || `item${itemIndex + 1}`,
              color: item.color || container.contentColor || container.color || '#ffffff',
              fontColor: item.fontColor || container.fontColor || '#000000',
              imageUrl: item.imageUrl || container.imageUrl || null,
              points: container.points.map(p => ({
                x: p.x + canvasOffset.x,
                y: p.y + canvasOffset.y
              })),
              opacity: 1
            })
          }
        }
        
        // Initialize teleport containers (matching ElementEditor approach)
        const topTeleportContainer = bundleContainers.find(c => c.teleportType === 'top')
        const bottomTeleportContainer = bundleContainers.find(c => c.teleportType === 'bottom')
        
        // Top teleport: next item after visible ones - will come in when scrolling down
        // Calculate the next item index that will come in when scrolling down
        // Visible items are startIndex, startIndex+1, ..., startIndex+numVisible-1
        // So next is (startIndex + numVisible) % bundleItemsList.length
        if (topTeleportContainer && bundleItemsList.length > 0) {
          const nextItemIndex = (startIndex + numVisible) % bundleItemsList.length
          const nextItem = bundleItemsList[nextItemIndex]
          allNewContentElements.push({
            id: `teleport-top-${topTeleportContainer.id}-${nextItem.id || nextItemIndex}`,
            bundleId: bundle.id,
            itemIndex: nextItemIndex,
            containerId: topTeleportContainer.id,
            text: nextItem.text || `item${nextItemIndex + 1}`,
            color: nextItem.color || topTeleportContainer.contentColor || topTeleportContainer.color || '#ffffff',
            fontColor: nextItem.fontColor || topTeleportContainer.fontColor || '#000000',
            imageUrl: nextItem.imageUrl || topTeleportContainer.imageUrl || null,
            points: topTeleportContainer.points.map(p => ({
              x: p.x + canvasOffset.x,
              y: p.y + canvasOffset.y
            })),
            opacity: 0
          })
        }
        
        // Bottom teleport: first item (index 0) - will come in when scrolling up
        if (bottomTeleportContainer && bundleItemsList.length > 0) {
          const firstItem = bundleItemsList[0]
          allNewContentElements.push({
            id: `teleport-bottom-${bottomTeleportContainer.id}-${firstItem.id || 0}`,
            bundleId: bundle.id,
            itemIndex: 0,
            containerId: bottomTeleportContainer.id,
            text: firstItem.text || 'item1',
            color: firstItem.color || bottomTeleportContainer.contentColor || bottomTeleportContainer.color || '#ffffff',
            fontColor: firstItem.fontColor || bottomTeleportContainer.fontColor || '#000000',
            imageUrl: firstItem.imageUrl || bottomTeleportContainer.imageUrl || null,
            points: bottomTeleportContainer.points.map(p => ({
              x: p.x + canvasOffset.x,
              y: p.y + canvasOffset.y
            })),
            opacity: 0
          })
        }
      } else {
        // LEGACY MODE: One element per container (for non-text bundles)
        normalContainers.forEach((container, positionIndex) => {
          allNewContentElements.push({
            id: `content-${container.id}`,
            bundleId: bundle.id,
            containerId: container.id,
            itemIndex: positionIndex,
            text: container.name?.replace('Container', 'Item') || `Item ${positionIndex + 1}`,
            color: container.contentColor || container.color || '#ffffff',
            fontColor: container.fontColor || '#000000',
            imageUrl: container.imageUrl || null,
            points: container.points.map(p => ({
              x: p.x + canvasOffset.x,
              y: p.y + canvasOffset.y
            })),
            opacity: 1
          })
        })
      }
    })
    
    setContentElements(allNewContentElements)
  }, [containers, bundles, canvasOffset.x, canvasOffset.y, items, bundleItems, visibleStartIndex])
  
  // Update canvasOffset ref when it changes (for use in callbacks)
  const canvasOffsetRef = useRef(canvasOffset)
  useEffect(() => {
    canvasOffsetRef.current = canvasOffset
  }, [canvasOffset])

  // ============================================================================
  // ANIMATION FUNCTIONS
  // ============================================================================
  
  const animateContentMorph = useCallback((
    contentElementId,
    targetContainerId,
    duration = 1
  ) => {
    return new Promise((resolve) => {
      const contentElement = contentElementsRef.current.find(ce => ce.id === contentElementId)
      const targetContainer = containers.find(c => c.id === targetContainerId)
      
      // Validate that content element and target container belong to the same bundle
      if (!contentElement || !targetContainer || contentElement.containerId === targetContainerId) {
        resolve()
        return
      }
      
      // Ensure bundle IDs match - prevent cross-bundle contamination
      if (contentElement.bundleId !== targetContainer.bundleId) {
        console.warn(`[animateContentMorph] Bundle mismatch: element bundleId=${contentElement.bundleId}, container bundleId=${targetContainer.bundleId}`)
        resolve()
        return
      }
      
      // Kill existing animations
      if (animationRefs.current[contentElementId]) {
        animationRefs.current[contentElementId].forEach(tween => tween.kill())
      }
      animationRefs.current[contentElementId] = []
      
      // Calculate target points with offset
      const targetPoints = targetContainer.points.map(p => ({
        x: p.x + canvasOffset.x,
        y: p.y + canvasOffset.y
      }))
      
      // Animate each point
      const tweens = []
      contentElement.points.forEach((point, index) => {
        const targetPoint = targetPoints[index]
        if (!targetPoint) return
        
        const proxy = { x: point.x, y: point.y }
        
        const tween = gsap.to(proxy, {
          x: targetPoint.x,
          y: targetPoint.y,
          duration: duration,
          ease: 'power2.inOut',
          onUpdate: () => {
            setContentElements(prev => prev.map(ce => {
              if (ce.id === contentElementId) {
                const newPoints = [...ce.points]
                newPoints[index] = { x: proxy.x, y: proxy.y }
                return { ...ce, points: newPoints }
              }
              return ce
            }))
          }
        })
        
        tweens.push(tween)
      })
      
      animationRefs.current[contentElementId] = tweens
      
      // Wait for all animations to complete
      let completedCount = 0
      tweens.forEach(tween => {
        tween.eventCallback('onComplete', () => {
          completedCount++
          if (completedCount === tweens.length) {
            resolve()
          }
        })
      })
      
      if (tweens.length === 0) resolve()
    })
  }, [containers, canvasOffset.x, canvasOffset.y])

  const teleportContentElement = useCallback((contentElementId, targetContainerId) => {
    const contentElement = contentElements.find(ce => ce.id === contentElementId)
    const targetContainer = containers.find(c => c.id === targetContainerId)
    if (!targetContainer || !contentElement) return
    
    // Ensure bundle IDs match - prevent cross-bundle contamination
    if (contentElement.bundleId !== targetContainer.bundleId) {
      console.warn(`[teleportContentElement] Bundle mismatch: element bundleId=${contentElement.bundleId}, container bundleId=${targetContainer.bundleId}`)
      return
    }
    
    const targetPoints = targetContainer.points.map(p => ({
      x: p.x + canvasOffset.x,
      y: p.y + canvasOffset.y
    }))
    
    setContentElements(prev => prev.map(ce => {
      if (ce.id === contentElementId) {
        return {
          ...ce,
          containerId: targetContainerId,
          points: targetPoints
        }
      }
      return ce
    }))
  }, [containers, contentElements, canvasOffset.x, canvasOffset.y])

  // Get items for a specific bundle (helper function matching ElementEditor)
  const getBundleItems = useCallback((bundleId) => {
    const bundleItemsData = bundleItems[bundleId]
    return bundleItemsData?.items || []
  }, [bundleItems])

  // Full animateDirection function using ElementEditor's scrolling list mode approach
  const animateDirection = useCallback((direction, scrollSpeed) => {
    if (isAnimating) return
    
    // Calculate animation duration based on scroll speed
    let duration = 1
    if (scrollSpeed !== undefined) {
      const maxSpeed = 100
      const minDuration = 0.2
      const maxDuration = 2
      const normalizedSpeed = Math.min(Math.abs(scrollSpeed), maxSpeed)
      duration = Math.max(minDuration, Math.min(maxDuration, maxDuration / (1 + normalizedSpeed / (maxSpeed * 0.5))))
    }
    
    // Check if any bundle is in scrolling list mode (items exist and more items than containers)
    const anyBundleInScrollingList = bundles.some(bundle => {
      const bundleContainers = containers.filter(c => c.bundleId === bundle.id)
      const normalContainers = bundleContainers.filter(c => c.teleportType === null)
      const bundleItemsList = getBundleItems(bundle.id)
      return bundleItemsList.length > 0 && bundleItemsList.length > normalContainers.length
    })
    
    // If in scrolling list mode, handle scrolling list animation (this is the working approach from ElementEditor)
    if (anyBundleInScrollingList) {
      const allAnimations = []
      
      bundles.forEach(bundle => {
        const bundleContainers = containers.filter(c => c.bundleId === bundle.id)
        let normalContainers = bundleContainers.filter(c => c.teleportType === null)
        
        // Sort containers by vertical position (Y coordinate) - top to bottom
        // Calculate average Y coordinate of each container's points for sorting
        normalContainers = normalContainers.sort((a, b) => {
          const avgY_a = a.points.reduce((sum, p) => sum + p.y, 0) / a.points.length
          const avgY_b = b.points.reduce((sum, p) => sum + p.y, 0) / b.points.length
          return avgY_a - avgY_b
        })
        
        // Only handle scrolling list mode if this bundle has more items than containers
        const bundleItemsList = getBundleItems(bundle.id)
        if (bundleItemsList.length > 0 && bundleItemsList.length > normalContainers.length) {
          // Find teleport containers for this bundle
          const topTeleportContainer = bundleContainers.find(c => c.teleportType === 'top')
          const bottomTeleportContainer = bundleContainers.find(c => c.teleportType === 'bottom')
          
          if (topTeleportContainer && bottomTeleportContainer) {
            const bundleContentElements = contentElements.filter(ce => ce.bundleId === bundle.id)
            const numVisible = normalContainers.length
            
            // Get current item indices in each container position
            const currentItemIndices = []
            for (let i = 0; i < numVisible; i++) {
              const container = normalContainers[i]
              const element = bundleContentElements.find(ce => 
                ce.containerId === container.id && ce.opacity === 1
              )
              if (element && element.itemIndex !== undefined) {
                currentItemIndices[i] = element.itemIndex
              }
            }
            
            if (currentItemIndices.length === numVisible) {
              // Circular buffer scrolling: elements shift one position, new item enters from teleport
              
              if (direction === 'down') {
                // Scrolling down:
                // 1. Bottommost element → bottom teleport (fade out)
                // 2. All other elements shift down one position
                // 3. New element from top teleport → topmost position (fade in)
                
                const bottomContainer = normalContainers[normalContainers.length - 1]
                const topContainer = normalContainers[0]
                
                const bottomElement = bundleContentElements.find(ce => 
                  ce.containerId === bottomContainer.id && ce.opacity === 1
                )
                
                // Find element in top teleport (this will be the new topmost)
                const topTeleportElement = bundleContentElements.find(ce => 
                  ce.containerId === topTeleportContainer.id && ce.opacity === 0 && ce.itemIndex !== undefined
                )
                
                if (bottomElement && topTeleportElement) {
                  // Step 1: Bottommost element fades out to bottom teleport
                  const fadeOutAndMorph = animateContentMorph(bottomElement.id, bottomTeleportContainer.id, duration).then(() => {
                    setContentElements(prev => prev.map(ce => {
                      if (ce.id === bottomElement.id) {
                        return { ...ce, containerId: bottomTeleportContainer.id, opacity: 0 }
                      }
                      return ce
                    }))
                  })
                  
                  const fadeOutTween = gsap.to({}, {
                    duration: duration,
                    ease: 'power2.inOut',
                    onUpdate: () => {
                      setContentElements(prev => prev.map(ce => {
                        if (ce.id === bottomElement.id) {
                          return { ...ce, opacity: Math.max(0, 1 - fadeOutTween.progress()) }
                        }
                        return ce
                      }))
                    }
                  })
                  
                  // Step 2: Shift all elements down (except bottommost)
                  const shiftAnimations = []
                  for (let i = numVisible - 2; i >= 0; i--) {
                    const currentContainer = normalContainers[i]
                    const nextContainer = normalContainers[i + 1]
                    const element = bundleContentElements.find(ce => 
                      ce.containerId === currentContainer.id && ce.opacity === 1
                    )
                    
                    if (element) {
                      shiftAnimations.push(
                        animateContentMorph(element.id, nextContainer.id, duration).then(() => {
                          setContentElements(prev => prev.map(ce => {
                            if (ce.id === element.id) {
                              return { ...ce, containerId: nextContainer.id }
                            }
                            return ce
                          }))
                        })
                      )
                    }
                  }
                  
                  // Step 3: Top teleport element fades in to topmost position
                  const fadeInDelay = duration * 0.3
                  const fadeInTween = gsap.to({}, {
                    duration: duration - fadeInDelay,
                    delay: fadeInDelay,
                    ease: 'power2.inOut',
                    onUpdate: () => {
                      setContentElements(prev => prev.map(ce => {
                        if (ce.id === topTeleportElement.id) {
                          const fadeInProgress = fadeInTween.progress()
                          const totalProgress = fadeInDelay + (fadeInProgress * (duration - fadeInDelay))
                          return { ...ce, opacity: Math.min(1, totalProgress / duration) }
                        }
                        return ce
                      }))
                    }
                  })
                  
                  const fadeInAndMorph = animateContentMorph(topTeleportElement.id, topContainer.id, duration).then(() => {
                    setContentElements(prev => prev.map(ce => {
                      if (ce.id === topTeleportElement.id) {
                        return { ...ce, containerId: topContainer.id, opacity: 1 }
                      }
                      return ce
                    }))
                  })
                  
                  allAnimations.push(
                    Promise.all([fadeOutAndMorph, ...shiftAnimations, fadeInAndMorph]).then(() => {
                      // Update teleport duplicates for next scroll
                      // Top teleport should have the next item that will come in from the top
                      // Bottom teleport should have the item that just left (bottomElement)
                      setContentElements(prev => {
                        const bundlePrevElements = prev.filter(ce => ce.bundleId === bundle.id)
                        const newTopElement = bundlePrevElements.find(ce => 
                          ce.containerId === topContainer.id && ce.opacity === 1
                        )
                        
                        // Calculate next item index for top teleport (current top + 1, wrapping)
                        // After scrolling down, the new top is topTeleportElement, so next item to come in is the one after it
                        let nextTopItemIndex = undefined
                        if (topTeleportElement.itemIndex !== undefined) {
                          nextTopItemIndex = (topTeleportElement.itemIndex + 1) % bundleItemsList.length
                        }
                        
                        let updated = prev.map(ce => {
                          if (ce.bundleId !== bundle.id) return ce
                          const isTopDuplicate = ce.containerId === topTeleportContainer.id && ce.opacity === 0
                          const isBottomDuplicate = ce.containerId === bottomTeleportContainer.id && ce.opacity === 0
                          if (isTopDuplicate || isBottomDuplicate) return null
                          return ce
                        }).filter(ce => ce !== null)
                        
                        // Update top teleport with next item
                        if (topTeleportContainer && nextTopItemIndex !== undefined) {
                          const nextItem = bundleItemsList[nextTopItemIndex]
                          if (nextItem) {
                            updated.push({
                              id: `teleport-top-${topTeleportContainer.id}-${nextItem.id}`,
                              bundleId: bundle.id,
                              itemIndex: nextTopItemIndex,
                              containerId: topTeleportContainer.id,
                              text: nextItem.text,
                              color: nextItem.color,
                              fontColor: nextItem.fontColor,
                              imageUrl: nextItem.imageUrl,
                              points: topTeleportContainer.points.map(p => ({
                                x: p.x + canvasOffset.x,
                                y: p.y + canvasOffset.y
                              })),
                              opacity: 0
                            })
                          }
                        }
                        
                        // Update bottom teleport with the item that just left (bottomElement)
                        if (bottomTeleportContainer && bottomElement) {
                          updated.push({
                            id: `teleport-bottom-${bottomTeleportContainer.id}-${bottomElement.itemIndex}`,
                            bundleId: bundle.id,
                            itemIndex: bottomElement.itemIndex,
                            containerId: bottomTeleportContainer.id,
                            text: bottomElement.text,
                            color: bottomElement.color,
                            fontColor: bottomElement.fontColor,
                            imageUrl: bottomElement.imageUrl,
                            points: bottomTeleportContainer.points.map(p => ({
                              x: p.x + canvasOffset.x,
                              y: p.y + canvasOffset.y
                            })),
                            opacity: 0
                          })
                        }
                        
                        return updated
                      })
                    })
                  )
                }
              } else {
                // Scrolling up:
                // 1. Topmost element → top teleport (fade out)
                // 2. All other elements shift up one position
                // 3. New element from bottom teleport → bottommost position (fade in)
                
                const topContainer = normalContainers[0]
                const bottomContainer = normalContainers[normalContainers.length - 1]
                
                const topElement = bundleContentElements.find(ce => 
                  ce.containerId === topContainer.id && ce.opacity === 1
                )
                
                // Find element in bottom teleport (this will be the new bottommost)
                const bottomTeleportElement = bundleContentElements.find(ce => 
                  ce.containerId === bottomTeleportContainer.id && ce.opacity === 0 && ce.itemIndex !== undefined
                )
                
                if (topElement && bottomTeleportElement) {
                  // Step 1: Topmost element fades out to top teleport
                  const fadeOutAndMorph = animateContentMorph(topElement.id, topTeleportContainer.id, duration).then(() => {
                    setContentElements(prev => prev.map(ce => {
                      if (ce.id === topElement.id) {
                        return { ...ce, containerId: topTeleportContainer.id, opacity: 0 }
                      }
                      return ce
                    }))
                  })
                  
                  const fadeOutTween = gsap.to({}, {
                    duration: duration,
                    ease: 'power2.inOut',
                    onUpdate: () => {
                      setContentElements(prev => prev.map(ce => {
                        if (ce.id === topElement.id) {
                          return { ...ce, opacity: Math.max(0, 1 - fadeOutTween.progress()) }
                        }
                        return ce
                      }))
                    }
                  })
                  
                  // Step 2: Shift all elements up (except topmost)
                  const shiftAnimations = []
                  for (let i = 1; i < numVisible; i++) {
                    const currentContainer = normalContainers[i]
                    const prevContainer = normalContainers[i - 1]
                    const element = bundleContentElements.find(ce => 
                      ce.containerId === currentContainer.id && ce.opacity === 1
                    )
                    
                    if (element) {
                      shiftAnimations.push(
                        animateContentMorph(element.id, prevContainer.id, duration).then(() => {
                          setContentElements(prev => prev.map(ce => {
                            if (ce.id === element.id) {
                              return { ...ce, containerId: prevContainer.id }
                            }
                            return ce
                          }))
                        })
                      )
                    }
                  }
                  
                  // Step 3: Bottom teleport element fades in to bottommost position
                  const fadeInDelay = duration * 0.3
                  const fadeInTween = gsap.to({}, {
                    duration: duration - fadeInDelay,
                    delay: fadeInDelay,
                    ease: 'power2.inOut',
                    onUpdate: () => {
                      setContentElements(prev => prev.map(ce => {
                        if (ce.id === bottomTeleportElement.id) {
                          const fadeInProgress = fadeInTween.progress()
                          const totalProgress = fadeInDelay + (fadeInProgress * (duration - fadeInDelay))
                          return { ...ce, opacity: Math.min(1, totalProgress / duration) }
                        }
                        return ce
                      }))
                    }
                  })
                  
                  const fadeInAndMorph = animateContentMorph(bottomTeleportElement.id, bottomContainer.id, duration).then(() => {
                    setContentElements(prev => prev.map(ce => {
                      if (ce.id === bottomTeleportElement.id) {
                        return { ...ce, containerId: bottomContainer.id, opacity: 1 }
                      }
                      return ce
                    }))
                  })
                  
                  allAnimations.push(
                    Promise.all([fadeOutAndMorph, ...shiftAnimations, fadeInAndMorph]).then(() => {
                      // Update teleport duplicates for next scroll
                      // Bottom teleport should have the next item that will come in from the bottom
                      // Top teleport should have the item that just left (topElement)
                      
                      // Calculate next item index for bottom teleport (current bottom + 1, wrapping)
                      let nextBottomItemIndex = undefined
                      if (bottomTeleportElement.itemIndex !== undefined) {
                        nextBottomItemIndex = (bottomTeleportElement.itemIndex + 1) % bundleItemsList.length
                      }
                      
                      setContentElements(prev => {
                        let updated = prev.map(ce => {
                          if (ce.bundleId !== bundle.id) return ce
                          const isTopDuplicate = ce.containerId === topTeleportContainer.id && ce.opacity === 0
                          const isBottomDuplicate = ce.containerId === bottomTeleportContainer.id && ce.opacity === 0
                          if (isTopDuplicate || isBottomDuplicate) return null
                          return ce
                        }).filter(ce => ce !== null)
                        
                        // Update bottom teleport with next item
                        if (bottomTeleportContainer && nextBottomItemIndex !== undefined) {
                          const nextItem = bundleItemsList[nextBottomItemIndex]
                          if (nextItem) {
                            updated.push({
                              id: `teleport-bottom-${bottomTeleportContainer.id}-${nextItem.id}`,
                              bundleId: bundle.id,
                              itemIndex: nextBottomItemIndex,
                              containerId: bottomTeleportContainer.id,
                              text: nextItem.text,
                              color: nextItem.color,
                              fontColor: nextItem.fontColor,
                              imageUrl: nextItem.imageUrl,
                              points: bottomTeleportContainer.points.map(p => ({
                                x: p.x + canvasOffset.x,
                                y: p.y + canvasOffset.y
                              })),
                              opacity: 0
                            })
                          }
                        }
                        
                        // Update top teleport with the item that just left (topElement)
                        if (topTeleportContainer && topElement) {
                          updated.push({
                            id: `teleport-top-${topTeleportContainer.id}-${topElement.itemIndex}`,
                            bundleId: bundle.id,
                            itemIndex: topElement.itemIndex,
                            containerId: topTeleportContainer.id,
                            text: topElement.text,
                            color: topElement.color,
                            fontColor: topElement.fontColor,
                            imageUrl: topElement.imageUrl,
                            points: topTeleportContainer.points.map(p => ({
                              x: p.x + canvasOffset.x,
                              y: p.y + canvasOffset.y
                            })),
                            opacity: 0
                          })
                        }
                        
                        return updated
                      })
                    })
                  )
                }
              }
            }
          }
        }
      })
      
      setIsAnimating(true)
      Promise.all(allAnimations).then(() => {
        setIsAnimating(false)
      }).catch(() => {
        setIsAnimating(false)
      })
      
      return // Skip normal animation logic
    }
    
    // Fallback: If not in scrolling list mode, do nothing (or implement legacy mode if needed)
    // For now, we'll just return since scrolling list mode should always be used
  }, [isAnimating, containers, contentElements, animateContentMorph, bundles, canvasOffset.x, canvasOffset.y, getBundleItems])

  // ============================================================================
  // RENDERING FUNCTIONS
  // ============================================================================
  
  // Full drawTransformedPath function with complete SVG path parsing
  // Perspective transform disabled - using simple linear transform instead
  const drawTransformedPath = useCallback((
    ctx,
    svgPath,
    sourceQuad,
    destQuad
  ) => {
    // Simple linear transform as fallback (no perspective warping)
    // This approximates the transform without the perspective-transform library
    const transformPoint = (x, y) => {
      // Simple bilinear interpolation as fallback
      const [sx1, sy1, sx2, sy2, sx3, sy3, sx4, sy4] = sourceQuad
      const [dx1, dy1, dx2, dy2, dx3, dy3, dx4, dy4] = destQuad
      
      // Normalize coordinates to 0-1 range
      const nx = x / 100
      const ny = y / 100
      
      // Simple bilinear interpolation
      const topX = dx1 + (dx2 - dx1) * nx
      const topY = dy1 + (dy2 - dy1) * nx
      const bottomX = dx4 + (dx3 - dx4) * nx
      const bottomY = dy4 + (dy3 - dy4) * nx
      
      const resultX = topX + (bottomX - topX) * ny
      const resultY = topY + (bottomY - topY) * ny
      
      return [resultX, resultY]
    }

    // Helper to convert SVG arc to canvas arc points
    const arcToCanvas = (
      x1, y1,
      rx, ry,
      rotation,
      largeArc,
      sweep,
      x2, y2
    ) => {
      const numSegments = 40
      const points = []
      
      const dx = (x1 - x2) / 2
      const dy = (y1 - y2) / 2
      const cosPhi = Math.cos(rotation * Math.PI / 180)
      const sinPhi = Math.sin(rotation * Math.PI / 180)
      const x1p = cosPhi * dx + sinPhi * dy
      const y1p = -sinPhi * dx + cosPhi * dy
      
      const lambda = (x1p * x1p) / (rx * rx) + (y1p * y1p) / (ry * ry)
      let rxScaled = rx
      let ryScaled = ry
      if (lambda > 1) {
        rxScaled = Math.sqrt(lambda) * rx
        ryScaled = Math.sqrt(lambda) * ry
      }
      
      const sign = largeArc === sweep ? -1 : 1
      const denom = (rxScaled * rxScaled) * (ryScaled * ryScaled) - (rxScaled * rxScaled) * (y1p * y1p) - (ryScaled * ryScaled) * (x1p * x1p)
      const s = sign * Math.sqrt(Math.max(0, denom) / ((rxScaled * rxScaled) * (y1p * y1p) + (ryScaled * ryScaled) * (x1p * x1p)))
      const cxp = s * rxScaled * y1p / ryScaled
      const cyp = s * -ryScaled * x1p / rxScaled
      
      const cx = cosPhi * cxp - sinPhi * cyp + (x1 + x2) / 2
      const cy = sinPhi * cxp + cosPhi * cyp + (x1 + y2) / 2
      
      const ux = (x1p - cxp) / rxScaled
      const uy = (y1p - cyp) / ryScaled
      const vx = (-x1p - cxp) / rxScaled
      const vy = (-y1p - cyp) / ryScaled
      
      let startAngle = Math.atan2(uy, ux)
      let deltaAngle = Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy)
      
      if (sweep === 0 && deltaAngle > 0) {
        deltaAngle -= 2 * Math.PI
      } else if (sweep === 1 && deltaAngle < 0) {
        deltaAngle += 2 * Math.PI
      }
      
      for (let i = 0; i <= numSegments; i++) {
        const angle = startAngle + (deltaAngle * i) / numSegments
        const x = cx + rxScaled * Math.cos(angle) * cosPhi - ryScaled * Math.sin(angle) * sinPhi
        const y = cy + rxScaled * Math.cos(angle) * sinPhi + ryScaled * Math.sin(angle) * cosPhi
        points.push([x, y])
      }
      
      return points
    }
    
    const commands = svgPath.match(/[MLZACQTHVmlzacthv][^MLZACQTHVmlzacthv]*/g) || []
    
    ctx.beginPath()
    
    let currentX = 0
    let currentY = 0
    let startX = 0
    let startY = 0
    let pathStarted = false
    
    for (const command of commands) {
      const type = command[0].toUpperCase()
      const isRelative = command[0] === command[0].toLowerCase()
      const coords = command.slice(1).trim().split(/[\s,]+/).filter(Boolean).map(Number)
      
      if (type === 'M') {
        if (coords.length >= 2) {
          const x = isRelative ? currentX + coords[0] : coords[0]
          const y = isRelative ? currentY + coords[1] : coords[1]
          const [tx, ty] = transformPoint(x, y)
          currentX = x
          currentY = y
          startX = x
          startY = y
          if (pathStarted) {
            ctx.moveTo(tx, ty)
          } else {
            ctx.moveTo(tx, ty)
            pathStarted = true
          }
        }
      } else if (type === 'L') {
        for (let i = 0; i < coords.length; i += 2) {
          if (i + 1 < coords.length) {
            const x = isRelative ? currentX + coords[i] : coords[i]
            const y = isRelative ? currentY + coords[i + 1] : coords[i + 1]
            const [tx, ty] = transformPoint(x, y)
            currentX = x
            currentY = y
            ctx.lineTo(tx, ty)
          }
        }
      } else if (type === 'Z') {
        const [tx, ty] = transformPoint(startX, startY)
        ctx.lineTo(tx, ty)
        ctx.closePath()
      } else if (type === 'A') {
        if (coords.length >= 7) {
          const [rx, ry, rotation, largeArc, sweep, x, y] = coords
          const endX = isRelative ? currentX + x : x
          const endY = isRelative ? currentY + y : y
          
          const arcPoints = arcToCanvas(
            currentX, currentY,
            rx, ry,
            rotation,
            largeArc,
            sweep,
            endX, endY
          )
          
          for (let i = 1; i < arcPoints.length; i++) {
            const [px, py] = arcPoints[i]
            const [tx, ty] = transformPoint(px, py)
            ctx.lineTo(tx, ty)
          }
          
          currentX = endX
          currentY = endY
        }
      } else if (type === 'C') {
        if (coords.length >= 6) {
          const [x1, y1, x2, y2, x, y] = coords
          const cp1X = isRelative ? currentX + x1 : x1
          const cp1Y = isRelative ? currentY + y1 : y1
          const cp2X = isRelative ? currentX + x2 : x2
          const cp2Y = isRelative ? currentY + y2 : y2
          const endX = isRelative ? currentX + x : x
          const endY = isRelative ? currentY + y : y
          
          const [tx1, ty1] = transformPoint(cp1X, cp1Y)
          const [tx2, ty2] = transformPoint(cp2X, cp2Y)
          const [tx, ty] = transformPoint(endX, endY)
          
          ctx.bezierCurveTo(tx1, ty1, tx2, ty2, tx, ty)
          currentX = endX
          currentY = endY
        }
      } else if (type === 'H') {
        for (let i = 0; i < coords.length; i++) {
          const x = isRelative ? currentX + coords[i] : coords[i]
          const [tx, ty] = transformPoint(x, currentY)
          currentX = x
          ctx.lineTo(tx, ty)
        }
      } else if (type === 'V') {
        for (let i = 0; i < coords.length; i++) {
          const y = isRelative ? currentY + coords[i] : coords[i]
          const [tx, ty] = transformPoint(currentX, y)
          currentY = y
          ctx.lineTo(tx, ty)
        }
      }
    }
    
    try {
      ctx.fill('evenodd')
    } catch {
      ctx.fill()
    }
    ctx.stroke()
  }, [])

  // Canvas rendering
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Clear canvas
    ctx.clearRect(0, 0, canvasWidth, canvasHeight)

    // Draw background
    ctx.fillStyle = backgroundColor === 'transparent' ? 'rgba(0,0,0,0)' : backgroundColor
    ctx.fillRect(0, 0, canvasWidth, canvasHeight)

    // Draw content elements
    contentElements.forEach(element => {
      if (element.opacity === 0) return
      
      ctx.save()
      ctx.globalAlpha = element.opacity
      
      // Draw element shape
      ctx.fillStyle = element.color
      ctx.strokeStyle = element.color
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(element.points[0].x, element.points[0].y)
      for (let i = 1; i < element.points.length; i++) {
        ctx.lineTo(element.points[i].x, element.points[i].y)
      }
      ctx.closePath()
      ctx.fill()
      ctx.stroke()
      
      // Draw text - simple canvas text rendering (only if text exists)
      if (element.text && element.text.length > 0 && element.text.trim() !== '') {
        // Calculate center of the quadrilateral
        const centerX = (element.points[0].x + element.points[1].x + element.points[2].x + element.points[3].x) / 4
        const centerY = (element.points[0].y + element.points[1].y + element.points[2].y + element.points[3].y) / 4
        
        // Calculate approximate width and height of container
        const width = Math.max(
          Math.abs(element.points[1].x - element.points[0].x),
          Math.abs(element.points[2].x - element.points[3].x)
        )
        const height = Math.max(
          Math.abs(element.points[3].y - element.points[0].y),
          Math.abs(element.points[2].y - element.points[1].y)
        )
        
        // Set font size based on container size
        const fontSize = Math.min(width / (element.text.length * 0.6), height * 0.4)
        ctx.font = `${fontSize}px Arial`
        ctx.fillStyle = element.fontColor
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        
        // Draw text at center
        ctx.fillText(element.text, centerX, centerY)
      }
      
      ctx.restore()
    })
  }, [contentElements, canvasWidth, canvasHeight, backgroundColor, dictionary, drawTransformedPath])

  // ============================================================================
  // SCROLL WHEEL HANDLING
  // ============================================================================
  
  const handleWheel = useCallback((e) => {
    if (isAnimating) return
    
    e.preventDefault()
    
    if (scrollThrottleRef.current !== null) return
    
    const direction = e.deltaY < 0 ? 'up' : 'down'
    const scrollSpeed = Math.abs(e.deltaY)
    
    animateDirection(direction, scrollSpeed)
    
    scrollThrottleRef.current = window.setTimeout(() => {
      scrollThrottleRef.current = null
    }, 100)
  }, [isAnimating, animateDirection])

  useEffect(() => {
    const canvasContainer = canvasContainerRef.current
    if (!canvasContainer) return

    canvasContainer.addEventListener('wheel', handleWheel, { passive: false })

    return () => {
      canvasContainer.removeEventListener('wheel', handleWheel)
      if (scrollThrottleRef.current !== null) {
        clearTimeout(scrollThrottleRef.current)
        scrollThrottleRef.current = null
      }
    }
  }, [handleWheel])

  // ============================================================================
  // RENDER - Just the canvas, nothing else
  // ============================================================================
  
  return (
    <div
      ref={canvasContainerRef}
      style={{
        position: 'relative',
        width: `${canvasWidth}px`,
        height: `${canvasHeight}px`,
        cursor: 'default',
        display: 'inline-block'
      }}
    >
      <canvas
        ref={canvasRef}
        width={canvasWidth}
        height={canvasHeight}
        style={{
          display: 'block',
          width: '100%',
          height: '100%'
        }}
      />
    </div>
  )
}

export default RadialMenuStandalone

