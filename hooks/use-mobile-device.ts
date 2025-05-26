"use client"

import { useEffect, useState } from "react"

export function useMobileDevice() {
  const [isMobile, setIsMobile] = useState(false)
  const [isTablet, setIsTablet] = useState(false)

  useEffect(() => {
    const checkDeviceType = () => {
      // Check if we're in a browser environment
      if (typeof window === "undefined") {
        return
      }
      
      const userAgent = navigator.userAgent
      const windowWidth = window.innerWidth
      
      // Check for mobile devices based on user agent
      const mobileDevice = Boolean(
        userAgent.match(/Android|BlackBerry|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i)
      )
      
      // Consider devices with width less than 768px as mobile
      const isMobileSize = windowWidth < 640
      
      // Consider devices with width between 640px and 1024px as tablets
      const isTabletSize = windowWidth >= 640 && windowWidth < 1024
      
      setIsMobile(mobileDevice || isMobileSize)
      setIsTablet(isTabletSize)
    }

    checkDeviceType()
    window.addEventListener("resize", checkDeviceType)
    return () => window.removeEventListener("resize", checkDeviceType)
  }, [])

  return { isMobile, isTablet }
}
