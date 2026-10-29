import React from 'react'
import ReactDOM from 'react-dom/client'
import { Gallery } from './Gallery'
import { Curator } from './Curator'
import { Collage } from './Collage'
import './styles.css'

const isCollage = location.pathname === '/collage' || location.pathname === '/collage/'
const isCurator = location.pathname === '/curate' || location.pathname === '/curate/'
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>{isCollage ? <Collage /> : isCurator ? <Curator /> : <Gallery />}</React.StrictMode>,
)
