import { useEffect, useState } from "react";

// Loads exactly one dataset's chunk+embedding JSON on demand, instead of
// bundling all 4 datasets x 2 tracks into the initial page load. Each of
// these files carries a full 384-dim vector per chunk — the cookbook alone
// is >10MB of embedded vectors per track — so eagerly importing everything
// up front tripled the shipped JS bundle for data most visits never touch.
// Vite code-splits each of these into its own chunk, fetched only when
// this hook actually needs it.
const LOADERS = {
  node: {
    career: () => import("../../data/processed/portfolio.json"),
    cars: () => import("../../data/processed/cars-jdm-legends.json"),
    sherlock: () => import("../../data/processed/sherlock-holmes.json"),
    cookbook: () => import("../../data/processed/cookbook.json"),
  },
  python: {
    career: () => import("../../data-py/processed/portfolio.json"),
    cars: () => import("../../data-py/processed/cars-jdm-legends.json"),
    sherlock: () => import("../../data-py/processed/sherlock-holmes.json"),
    cookbook: () => import("../../data-py/processed/cookbook.json"),
  },
};

export function useDataset(track, id) {
  const [dataset, setDataset] = useState(null);

  useEffect(() => {
    if (!id) {
      setDataset(null);
      return;
    }
    let cancelled = false;
    setDataset(null);
    LOADERS[track][id]().then((mod) => {
      if (!cancelled) setDataset(mod.default);
    });
    return () => {
      cancelled = true;
    };
  }, [track, id]);

  return dataset;
}
