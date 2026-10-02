import React from 'react'
import ReactDOM from 'react-dom/client'
import { Gallery } from './Gallery'
import { Curator } from './Curator'
import './styles.css'

const isCurator = location.pathname === '/curate' || location.pathname === '/curate/'
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>{isCurator ? <Curator /> : <Gallery />}</React.StrictMode>,
)
