import { useEffect, useState } from 'react'
import { LayersControl, MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Leafletes Standard-Icon verweist auf Bilddateien, deren Pfad Vite anders
// auflöst als der klassische Leaflet-Build erwartet (das "kaputte Bild"-
// Symbol). Statt das zu reparieren, zeichnen wir den Standort-Marker als
// eigenes Inline-SVG — ohne externe Bilddatei, also unabhängig vom Bundler.
const standortIcon = L.divIcon({
  className: 'standort-icon',
  html: `<svg viewBox="0 0 24 24" width="32" height="32" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z"
      fill="#e02424"
      stroke="#7a1414"
      stroke-width="0.5"
    />
  </svg>`,
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -28],
})

// Grobes Zentrum von Niedersachsen, Zoomstufe zeigt das ganze Bundesland.
const NIEDERSACHSEN_ZENTRUM: [number, number] = [52.9, 9.5]
const NIEDERSACHSEN_ZOOM = 8
const STANDORT_ZOOM = 14

type Standort =
  | { status: 'wird-ermittelt' }
  | { status: 'gefunden'; position: [number, number] }
  | { status: 'nicht-verfuegbar'; meldung: string }

// Bewegt die schon laufende Karte zur gefundenen Position. Das muss eine
// eigene Komponente innerhalb von MapContainer sein, weil useMap() nur dort
// funktioniert, wo eine Karteninstanz bereits existiert.
function Kartenzentrierung({ standort }: { standort: Standort }) {
  const map = useMap()

  useEffect(() => {
    if (standort.status === 'gefunden') {
      map.setView(standort.position, STANDORT_ZOOM)
    }
  }, [standort, map])

  return null
}

// Synchron prüfbare Voraussetzungen werden direkt beim ersten Render
// ausgewertet, damit der Effekt selbst kein setState außerhalb einer
// asynchronen Rückmeldung aufrufen muss.
function ermittleStartStatus(): Standort {
  if (!window.isSecureContext) {
    return {
      status: 'nicht-verfuegbar',
      meldung: 'Standortabfrage benötigt HTTPS oder localhost.',
    }
  }
  if (!navigator.geolocation) {
    return {
      status: 'nicht-verfuegbar',
      meldung: 'Dieser Browser unterstützt keine Standortabfrage.',
    }
  }
  return { status: 'wird-ermittelt' }
}

function Karte() {
  const [standort, setStandort] = useState<Standort>(ermittleStartStatus)

  useEffect(() => {
    if (!window.isSecureContext || !navigator.geolocation) {
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setStandort({
          status: 'gefunden',
          position: [position.coords.latitude, position.coords.longitude],
        })
      },
      (error) => {
        let meldung: string
        switch (error.code) {
          case error.PERMISSION_DENIED:
            meldung = 'Standortzugriff wurde abgelehnt.'
            break
          case error.TIMEOUT:
            meldung = 'Standortabfrage hat zu lange gedauert.'
            break
          default:
            meldung = 'Standort ist nicht verfügbar.'
        }
        setStandort({ status: 'nicht-verfuegbar', meldung })
      },
      { timeout: 10000 },
    )
  }, [])

  return (
    <div style={{ position: 'relative', height: '100%', width: '100%' }}>
      {standort.status === 'nicht-verfuegbar' && (
        <div
          style={{
            position: 'absolute',
            top: 10,
            left: 10,
            zIndex: 1000,
            background: 'white',
            padding: '8px 12px',
            borderRadius: 4,
            boxShadow: '0 1px 4px rgba(0, 0, 0, 0.3)',
            fontSize: 14,
            maxWidth: 280,
          }}
        >
          {standort.meldung} Zeige Niedersachsen.
        </div>
      )}

      <MapContainer
        center={NIEDERSACHSEN_ZENTRUM}
        zoom={NIEDERSACHSEN_ZOOM}
        style={{ height: '100%', width: '100%' }}
      >
        <LayersControl position="topright">
          <LayersControl.BaseLayer checked name="OpenStreetMap">
            <TileLayer
              attribution="&copy; OpenStreetMap-Mitwirkende"
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer name="TopPlusOpen (BKG)">
            <TileLayer
              attribution="&copy; Bundesamt für Kartographie und Geodäsie (BKG), dl-de/by-2-0"
              url="https://sgx.geodatenzentrum.de/wmts_topplus_open/tile/1.0.0/web/default/WEBMERCATOR/{z}/{y}/{x}.png"
            />
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer name="Satellit (Esri World Imagery)">
            <TileLayer
              attribution="Tiles &copy; Esri &mdash; Quellen: Esri, Maxar, Earthstar Geographics und die GIS-Community"
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            />
          </LayersControl.BaseLayer>
        </LayersControl>
        <Kartenzentrierung standort={standort} />
        {standort.status === 'gefunden' && (
          <Marker position={standort.position} icon={standortIcon}>
            <Popup>Dein Standort</Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  )
}

export default Karte
