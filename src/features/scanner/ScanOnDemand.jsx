// @ts-check
import * as React from 'react'
import { useQuery, useLazyQuery } from '@apollo/client'

import { useMemory } from '@store/useMemory'
import { useStorage } from '@store/useStorage'

import { SCANNER_CONFIG, SCANNER_STATUS } from '@services/queries/scanner'

import { ScanNext } from './scanNext'
import { ScanZone } from './scanZone'
import { ScanQuest } from './scanQuest'
import { getScanNextCoords } from './scanNext/getCoords'
import { getScanZoneCoords } from './scanZone/getCoords'
import { getScanQuestCoords } from './scanQuest/getCoords'
import { ConfigContext, DEFAULT } from './ContextProvider'
import { useScanStore, useScannerSessionStorage } from './hooks/store'

const { setScanMode } = useScanStore.getState()

/**
 *
 * @param {{ mode: 'scanNext' | 'scanZone' | 'scanQuest' }} props
 * @returns {JSX.Element}
 */
function BaseScanOnDemand({ mode }) {
  const scanMode = useScanStore((s) => s[`${mode}Mode`])
  const location = useStorage((s) => s.location)
  const online = useMemory((s) => s.online)

  const [getConfig, { data }] = useLazyQuery(SCANNER_CONFIG, {
    variables: { mode },
    initialFetchPolicy: 'network-only',
    nextFetchPolicy: 'cache-first',
  })

  /** @type {typeof DEFAULT} */
  const config = React.useMemo(() => data?.scannerConfig || DEFAULT, [data])

  const [scan, { error: scannerError, data: scannerResponse }] = useLazyQuery(
    SCANNER_STATUS,
    {
      fetchPolicy: 'cache-first',
    },
  )

  const { data: scannerQueueResponse } = useQuery(SCANNER_STATUS, {
    variables: {
      category: 'getQueue',
      method: 'GET',
      data: {
        type: 'scan_next',
        typeName: mode,
      },
    },
    fetchPolicy: 'no-cache',
    skip: !scanMode,
    pollInterval: config.refreshQueue * 1000,
  })

  const demandScan = () => {
    const { scanCoords, validCoords, scanLocation, ...rest } =
      useScanStore.getState()
    const baseCooldown = typeof config.cooldown === 'number' ? config.cooldown : 0
    const cooldown =
      (mode === 'scanQuest'
        ? baseCooldown
        : baseCooldown * validCoords.filter(Boolean).length) *
        1000 +
      Date.now()
    useScannerSessionStorage.setState((prev) => ({
      ...prev,
      [mode]: cooldown,
    }))
    if (mode === 'scanQuest') {
      // eslint-disable-next-line no-console
      console.log('[ScanQuest] sending coordinates', {
        scanCoords: scanCoords.filter((_, i) => validCoords[i]),
        scanLocation,
      })
    }
    setScanMode(`${mode}Mode`, 'loading')
    scan({
      variables: {
        category: mode,
        method: 'GET',
        data: {
          scanLocation,
          scanCoords: scanCoords.filter((_, i) => validCoords[i]),
          scanSize: rest[`${mode}Size`],
          cooldown,
        },
      },
    })
  }

  React.useEffect(() => {
    if (scanMode === 'sendCoords' && config.enabled) {
      demandScan()
    }
  }, [scanMode])

  React.useEffect(() => {
    if (scannerError) {
      // eslint-disable-next-line no-console
      console.error('[ScanQuest] scanner error', scannerError)
      setScanMode(`${mode}Mode`, 'error')
    }
    if (scannerResponse) {
      if (mode === 'scanQuest') {
        // eslint-disable-next-line no-console
        console.log('[ScanQuest] scanner response', scannerResponse)
      }
      if (scannerResponse?.scanner?.status === 'ok') {
        setScanMode(`${mode}Mode`, 'confirmed')
      } else {
        setScanMode(`${mode}Mode`, 'error')
      }
    }
  }, [scannerError, scannerResponse])

  React.useEffect(() => {
    if (scannerQueueResponse?.scanner?.status === 'ok') {
      if (mode === 'scanQuest') {
        // eslint-disable-next-line no-console
        console.log('[ScanQuest] queue size', scannerQueueResponse.scanner.message)
      }
      useScanStore.setState({ queue: scannerQueueResponse.scanner.message })
    }
  }, [scannerQueueResponse])

  React.useEffect(() => {
    const { scanNextMode, scanZoneMode, scanQuestMode } = useScanStore.getState()
    if (scanNextMode === '' && scanZoneMode === '' && scanQuestMode === '') {
      useScanStore.setState({ scanLocation: location })
    }
  }, [location, scanMode])

  React.useEffect(() => {
    if (online && scanMode) {
      getConfig()
    }
  }, [online, scanMode])

  React.useEffect(() => {
    const subscription = useScanStore.subscribe((next, prev) => {
      if (
        next[`${mode}Mode`] &&
        ((!prev.scanNextMode && next.scanNextMode) ||
          (!prev.scanZoneMode && next.scanZoneMode) ||
          (!prev.scanQuestMode && next.scanQuestMode) ||
          next.userRadius !== prev.userRadius ||
          next.userSpacing !== prev.userSpacing ||
          next.scanNextSize !== prev.scanNextSize ||
          next.scanZoneSize !== prev.scanZoneSize ||
          next.scanLocation.some((x, i) => x !== prev.scanLocation[i]))
      ) {
        const scanCoords =
          mode === 'scanZone'
            ? getScanZoneCoords(
                next.scanLocation,
                next.userRadius,
                next.userSpacing,
                next.scanZoneSize,
              )
            : mode === 'scanQuest'
              ? getScanQuestCoords(next.scanLocation)
              : getScanNextCoords(next.scanLocation, next.scanNextSize)
        useScanStore.setState({ scanCoords })
        if (mode === 'scanQuest') {
          // eslint-disable-next-line no-console
          console.log('[ScanQuest] updated coords', scanCoords)
        }
      }
    })
    return () => {
      subscription()
    }
  }, [mode])

  if (scanMode !== 'setLocation') return null

  return (
    <ConfigContext.Provider value={config}>
      {mode === 'scanNext' ? (
        <ScanNext />
      ) : mode === 'scanZone' ? (
        <ScanZone />
      ) : (
        <ScanQuest />
      )}
    </ConfigContext.Provider>
  )
}

export const ScanOnDemand = React.memo(
  BaseScanOnDemand,
  (prev, next) => prev.mode === next.mode,
)
