import type { CapePoint, Zone } from "./types";

// Historical S&P / Shiller CAPE samples — yearly, 1900..2026.
// Sourced offline from Robert Shiller's public dataset (online-data.xls).
// The build:data script overwrites these from the live CSV on each cron run.
const RAW: Array<[number, number]> = [
  [1900, 18.3], [1901, 22.4], [1902, 22.9], [1903, 16.5], [1904, 16.4],
  [1905, 19.6], [1906, 20.7], [1907, 13.7], [1908, 17.0], [1909, 19.6],
  [1910, 16.2], [1911, 16.0], [1912, 16.5], [1913, 13.7], [1914, 12.0],
  [1915, 12.0], [1916, 12.6], [1917, 8.5],  [1918, 6.7],  [1919, 8.6],
  [1920, 5.1],  [1921, 6.7],  [1922, 9.5],  [1923, 8.7],  [1924, 9.5],
  [1925, 12.3], [1926, 11.4], [1927, 14.6], [1928, 19.3], [1929, 27.1],
  [1930, 22.0], [1931, 16.4], [1932, 9.3],  [1933, 9.6],  [1934, 13.5],
  [1935, 11.6], [1936, 17.6], [1937, 22.2], [1938, 13.5], [1939, 14.1],
  [1940, 13.9], [1941, 11.5], [1942, 9.6],  [1943, 11.0], [1944, 11.3],
  [1945, 12.0], [1946, 14.0], [1947, 11.3], [1948, 10.6], [1949, 10.0],
  [1950, 11.2], [1951, 12.6], [1952, 13.0], [1953, 11.7], [1954, 14.4],
  [1955, 18.6], [1956, 18.5], [1957, 16.7], [1958, 17.0], [1959, 19.6],
  [1960, 18.3], [1961, 21.5], [1962, 18.7], [1963, 20.1], [1964, 21.6],
  [1965, 23.3], [1966, 21.4], [1967, 20.4], [1968, 21.5], [1969, 21.2],
  [1970, 16.5], [1971, 18.7], [1972, 18.7], [1973, 17.5], [1974, 11.7],
  [1975, 8.9],  [1976, 11.2], [1977, 9.3],  [1978, 8.4],  [1979, 9.3],
  [1980, 8.9],  [1981, 9.2],  [1982, 7.4],  [1983, 9.8],  [1984, 9.9],
  [1985, 10.8], [1986, 13.6], [1987, 16.3], [1988, 13.5], [1989, 15.6],
  [1990, 17.1], [1991, 15.7], [1992, 19.9], [1993, 20.8], [1994, 20.3],
  [1995, 20.4], [1996, 24.7], [1997, 28.3], [1998, 32.8], [1999, 40.6],
  [2000, 43.8], [2001, 36.9], [2002, 30.4], [2003, 22.9], [2004, 27.6],
  [2005, 26.5], [2006, 26.5], [2007, 27.2], [2008, 24.0], [2009, 15.2],
  [2010, 20.5], [2011, 22.9], [2012, 21.2], [2013, 22.4], [2014, 26.0],
  [2015, 27.4], [2016, 25.9], [2017, 28.4], [2018, 32.9], [2019, 28.4],
  [2020, 30.0], [2021, 35.4], [2022, 39.6], [2023, 28.0], [2024, 31.3],
  [2025, 33.2], [2026, 34.6],
];

function zoneForCape(cape: number): Zone {
  if (cape >= 30) return "warning";
  if (cape >= 22) return "watch";
  if (cape >= 14) return "watch";
  return "clear";
}

// Compute "cycle position" — 0 at trough, 1 at peak, then resets — over a
// rolling local window. This colours each loop of the spiral.
function withCycleT(rows: Array<[number, number]>): CapePoint[] {
  const out: CapePoint[] = [];
  const window = 11; // ~half-cycle window
  for (let i = 0; i < rows.length; i++) {
    const [year, cape] = rows[i];
    const lo = Math.max(0, i - window);
    const hi = Math.min(rows.length - 1, i + window);
    let mn = Infinity, mx = -Infinity;
    for (let j = lo; j <= hi; j++) {
      mn = Math.min(mn, rows[j][1]);
      mx = Math.max(mx, rows[j][1]);
    }
    const t = mx - mn < 1e-6 ? 0.5 : (cape - mn) / (mx - mn);
    out.push({ year, cape, cycleT: t, zone: zoneForCape(cape) });
  }
  return out;
}

export const CAPE_HISTORY: CapePoint[] = withCycleT(RAW);
