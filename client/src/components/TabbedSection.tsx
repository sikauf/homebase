import { Routes, Route, Navigate } from 'react-router-dom'
import { ComponentType } from 'react'
import TabBar from './TabBar'

export interface TabbedSectionTab {
  label: string
  path: string
  Page: ComponentType
}

interface Props {
  basePath: string
  tabs: TabbedSectionTab[]
  reorderable?: boolean
  persistKey?: string
  routesClassName?: string
}

export default function TabbedSection({
  basePath,
  tabs,
  reorderable = true,
  persistKey,
  routesClassName,
}: Props) {
  const tabBarTabs = tabs.map((t) => ({ label: t.label, to: `${basePath}/${t.path}` }))
  const key = persistKey ?? basePath.replace(/^\/+/, '').replace(/\//g, '-')
  const defaultPath = tabs[0]?.path

  const routes = (
    <Routes>
      {defaultPath && <Route index element={<Navigate to={defaultPath} replace />} />}
      {tabs.map((t) => (
        <Route key={t.path} path={t.path} element={<t.Page />} />
      ))}
    </Routes>
  )

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <TabBar tabs={tabBarTabs} persistKey={reorderable ? key : undefined} />
      {routesClassName ? <div className={routesClassName}>{routes}</div> : routes}
    </div>
  )
}
