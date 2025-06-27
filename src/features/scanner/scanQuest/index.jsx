// @ts-check
import * as React from 'react'

import { ScanCircle } from '../Shared'
import { useCheckValid } from '../hooks/useCheckValid'
import { ScanOnDemandMarker } from '../Marker'
import { ScanOnDemandPopup } from '../Popup'
import { useScanStore } from '../hooks/store'

const QUEST_RADIUS = 750

/**
 * @returns {JSX.Element}
 */
export function ScanQuest() {
  useCheckValid('scanQuest')
  const scanLocation = useScanStore((s) => s.scanLocation)

  return (
    <>
      <ScanOnDemandMarker>
        <ScanOnDemandPopup mode="scanQuest" />
      </ScanOnDemandMarker>
      <ScanCircle lat={scanLocation[0]} lon={scanLocation[1]} radius={QUEST_RADIUS} />
    </>
  )
}
