import { useEffect, useState } from 'react'
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'

// Vite bündelt Bilder anders als der klassische Leaflet-Build erwartet,
// daher müssen die Marker-Bild-URLs hier explizit gesetzt werden.
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
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
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>-Mitwirkende'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Kartenzentrierung standort={standort} />
        {standort.status === 'gefunden' && (
          <Marker position={standort.position}>
            <Popup>Dein Standort</Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  )
}

export default Karte
