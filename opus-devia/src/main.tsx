import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import Router from './router'
import { ThemeProvider } from './context/ThemeContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <div className="animated-bg">
      <div className="bg-blob bg-blob--1" />
      <div className="bg-blob bg-blob--2" />
      <div className="bg-blob bg-blob--3" />
      <div className="bg-blob bg-blob--4" />
      <div className="bg-blob bg-blob--5" />
      <div className="bg-blob bg-blob--6" />
    </div>
    <ThemeProvider>
      <Router />
    </ThemeProvider>
  </StrictMode>,
)
