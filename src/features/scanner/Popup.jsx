// @ts-check
import * as React from 'react'
import List from '@mui/material/List'
import { Popup } from 'react-leaflet'
import { useTranslation } from 'react-i18next'

import { DividerWithMargin } from '@components/StyledDivider'
import { useScanStore } from './hooks/store'

import {
  InAllowedArea,
  ScanCancel,
  ScanConfirm,
  ScanQueue,
  ScanRequests,
  StyledListItemText,
} from './Shared'
import { ConfigContext } from './ContextProvider'

/**
 *
 * @param {{ children: React.ReactNode, mode: import('./hooks/store').ScanMode }} props
 * @returns
 */
export function ScanOnDemandPopup({ children, mode }) {
  const { t } = useTranslation()
  const context = React.useContext(ConfigContext)
  const queue = useScanStore((s) => s.queue)
  const minutes = React.useMemo(() => {
    if (mode !== 'scanQuest') return 0
    return typeof queue === 'number' && queue > 0 ? queue * 3 : 3
  }, [mode, queue])

  return (
    <Popup minWidth={90} maxWidth={200} autoPan={false}>
      <List>
        <StyledListItemText
          className="no-leaflet-margin"
          secondary={t(
            mode === 'scanZone'
              ? 'scan_zone_choose'
              : mode === 'scanQuest'
                ? 'scan_quest_choose'
                : 'scan_next_choose',
            mode === 'scanQuest' ? { minutes } : undefined,
          )}
        />
        <DividerWithMargin />
        {context.scannerType !== 'mad' && children}
        {context.showScanCount && <ScanRequests />}
        {context.showScanQueue && <ScanQueue />}
        <DividerWithMargin />
        <ScanConfirm mode={mode} />
        <InAllowedArea />
        <ScanCancel mode={mode} />
      </List>
    </Popup>
  )
}
