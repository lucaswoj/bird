import { useEffect, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import FeatureCollection from "@turf/helpers";
import * as turf from "@turf/turf";

interface Bird {
  shown: boolean;
  extraKeys: string;
  keys: string;
  color: string;
}

function App() {
  const [el, setEl] = useState<HTMLDivElement | null>();
  const [map, setMap] = useState<maplibregl.Map | null>(null);
  const [lines, setLines] = useState<FeatureCollection | null>(null);
  const [birds, setBirds] = useState<Bird[] | null>(null);
  const [showUnknown, setShowUnknown] = useState(true);

  useEffect(() => {
    if (!el) return;
    const map = new maplibregl.Map({
      container: el,
      style:
        "https://api.maptiler.com/maps/topo-v2/style.json?key=6YootlPsCsdm1OoZ5ou1",
      center: [-118.73568101989429, 37.67930024679403],
      zoom: 10,
    });
    map.on('click', (event) => {
      // copy lat, lng to clipboard
      navigator.clipboard.writeText(
        `${event.lngLat.lat}, ${event.lngLat.lng}`
      );
    })
    window.map = map;
    setMap(map);
    return () => map.remove();
  }, [el]);

  useEffect(() => {
    if (!map || !lines) return;
    if (map.getSource("birds")) map.removeSource("birds");
    map.addSource("birds", {
      type: "geojson",
      data: {
        type: "FeatureCollection",
        features: lines.features.map(
          (line: GeoJSON.Feature<GeoJSON.LineString>) => {
            const birdIndex = !birds
              ? -1
              : birds.findIndex((bird) =>
                  (bird.keys + "," + bird.extraKeys)
                    .split(",")
                    .filter(s => s.trim())
                    .find((key) =>
                      JSON.stringify(line.properties).toLowerCase().includes(key.trim().toLowerCase())
                    )
                );

            if (birdIndex === -1 && !showUnknown) return;
            if (birdIndex !== -1 && birds?.[birdIndex].shown === false) return;

            const bearing = turf.bearing(
              turf.point(line.geometry.coordinates[0]),
              turf.point(line.geometry.coordinates[1])
            );

            return {
              type: "Feature",
              geometry: {
                type: "LineString",
                coordinates: [
                  turf.destination(
                    turf.point(line.geometry.coordinates[0]),
                    100,
                    bearing,
                    "miles"
                  ).geometry.coordinates,
                  turf.destination(
                    turf.point(line.geometry.coordinates[0]),
                    -100,
                    bearing,
                    "miles"
                  ).geometry.coordinates,
                ],
              },
              properties: {
                birdIndex,
                color: birds?.[birdIndex]?.color || "black",
                values: Object.values(line.properties || {}).join(", "),
              },
            };
          }
        ).filter(Boolean),
      },
    });

    if (map.getLayer("birds")) map.removeLayer("birds");
    map.addLayer({
      id: "birds",
      type: "line",
      source: "birds",
      paint: {
        "line-color": ["get", "color"],
        "line-width": 2,
      },
    });

    if (map.getLayer("birds-symbol")) map.removeLayer("birds-symbol");
    map.addLayer({
      id: "birds-symbol",
      type: "symbol",
      source: "birds",
      layout: {
        "text-field": ["get", "values"],
        "text-size": 12,
        "text-anchor": "top",
        "symbol-placement": "line",
      },
    });

    return () => {
      try {
        map.removeLayer("birds");
        map.removeLayer("birds-symbol");
        map.removeSource("birds");
      } catch (e) {
        console.error(e);
      }
    };
  }, [map, lines, birds, showUnknown]);

  return (
    <>
      <label style={{ display: "block" }}>
        <input
          type="file"
          onChange={(event) => {
            const fileReader = new FileReader();
            fileReader.onload = (event) => {
              setLines(JSON.parse(event.target?.result as string));
            };
            fileReader.readAsText(event.target.files![0]);
          }}
        />
        GeoJSON (exported from Gaia GPS)
      </label>

      <label style={{ display: "block" }}>
        <input
          type="file"
          onChange={(event) => {
            const fileReader = new FileReader();
            fileReader.onload = (event) => {
              setBirds(
                (event.target?.result as string)
                  .split("\n")
                  .filter(Boolean)
                  .map((keys, i) => ({
                    shown: true,
                    keys,
                    color: palette[i % palette.length],
                    extraKeys: "",
                  }))
              );
            };
            fileReader.readAsText(event.target.files![0]);
          }}
        />
        CSV (exported from Excel)
      </label>

      <div style={{ height: 500 }} ref={setEl} />

      <table>
        <tr>
          <td><input type="checkbox" checked={showUnknown} onChange={(event) => setShowUnknown(event.target.checked)} /></td>
          <td style={{ width: 32, backgroundColor: unknownColor }}></td>
          <td>unknown</td>
        </tr>

        {birds?.map((bird, i) => (
          <tr key={i}>
            <td><input type="checkbox" checked={bird.shown} onChange={(event) => setBirds(
                    birds.map((b, j) =>
                      i === j ? { ...b, shown: event.target.checked } : b
                    )
                  )} /></td>
            <td style={{ width: 32, backgroundColor: bird.color }}></td>
            <td>{bird.keys}</td>
            <td>
              <input
                placeholder="additional keys, comma separated"
                onChange={(event) => {
                  setBirds(
                    birds.map((b, j) =>
                      i === j ? { ...b, extraKeys: event.target.value } : b
                    )
                  );
                }}
              />
            </td>
          </tr>
        ))}
      </table>
    </>
  );
}

export default App;

const palette = [
  "#63c74d",
  "#ff0044",
  "#feae34",
  "#733e39",
  "#f6757a",
  "#ffffff",
  "#3e8948",
  "#c0cbdc",
  "#e4a672",
  "#ead4aa",
  "#193c3e",
  "#f77622",
  "#2ce8f5",
  "#3e2731",
  "#e43b44",
  "#b86f50",
  "#265c42",
  "#5a6988",
  "#c28569",
  "#124e89",
  "#0099db",
  "#3a4466",
  "#68386c",
  "#a22633",
  "#b55088",
  "#e8b796",
  "#d77643",
  "#fee761",
  "#8b9bb4",
  "#262b44",
  "#be4a2f",
];

const unknownColor = "#000";
