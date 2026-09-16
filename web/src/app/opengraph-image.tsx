import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'AnchorFlow User Study'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#f4f7f9',
          flexDirection: 'column',
        }}
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="300" height="300">
          <rect width="256" height="256" rx="56" fill="#f4f7f9"/>
          
          <path d="M 64 192 C 64 100, 120 64, 192 64" fill="none" stroke="#4a8ab0" stroke-width="20" stroke-linecap="round"/>
          
          <line x1="64" y1="192" x2="64" y2="100" stroke="#9a7040" stroke-width="12"/>
          <circle cx="64" cy="100" r="16" fill="#b8904a" stroke="white" stroke-width="8"/>
          
          <circle cx="64" cy="192" r="24" fill="#1a5c82" stroke="white" stroke-width="10"/>
        </svg>
        <div style={{ marginTop: 40, fontSize: 64, fontWeight: 700, color: '#1a5c82', fontFamily: 'sans-serif' }}>
          AnchorFlow User Study
        </div>
      </div>
    ),
    { ...size }
  )
}
