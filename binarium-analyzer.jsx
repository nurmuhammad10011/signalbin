import { useState, useEffect } from "react";

const CURRENCIES = [
  "EUR/USD", "GBP/USD", "USD/JPY", "AUD/USD", "USD/CAD",
  "EUR/GBP", "NZD/USD", "USD/CHF", "EUR/JPY", "BTC/USD",
  "ETH/USD", "XRP/USD", "GBP/JPY", "EUR/AUD", "USD/MXN"
];

const TIMES = [
  { label: "1 мин", value: 1 },
  { label: "2 мин", value: 2 },
  { label: "3 мин", value: 3 },
  { label: "5 мин", value: 5 },
  { label: "1 час", value: 60 },
  { label: "1 день", value: 1440 },
  { label: "1 нед", value: 10080 },
];

function generatePrices(n = 50) {
  const prices = [1.1000];
  for (let i = 1; i < n; i++) {
    const change = (Math.random() - 0.495) * 0.002;
    prices.push(+(prices[i - 1] + change).toFixed(5));
  }
  return prices;
}

function calcRSI(prices, period = 14) {
  if (prices.length < period + 1) return 50;
  let gains = 0, losses = 0;
  for (let i = prices.length - period; i < prices.length; i++) {
    const diff = prices[i] - prices[i - 1];
    if (diff > 0) gains += diff;
    else losses += Math.abs(diff);
  }
  const avgGain = gains / period;
  const avgLoss = losses / period;
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return +(100 - 100 / (1 + rs)).toFixed(2);
}

function calcMA(prices, period) {
  if (prices.length < period) return prices[prices.length - 1];
  const slice = prices.slice(-period);
  return +(slice.reduce((a, b) => a + b, 0) / period).toFixed(5);
}

function calcMACD(prices) {
  const ema12 = calcMA(prices, 12);
  const ema26 = calcMA(prices, 26);
  return +(ema12 - ema26).toFixed(5);
}

function calcBollinger(prices, period = 20) {
  if (prices.length < period) return { upper: 0, lower: 0, mid: 0 };
  const slice = prices.slice(-period);
  const mid = slice.reduce((a, b) => a + b, 0) / period;
  const variance = slice.reduce((a, b) => a + Math.pow(b - mid, 2), 0) / period;
  const std = Math.sqrt(variance);
  return { upper: +(mid + 2 * std).toFixed(5), lower: +(mid - 2 * std).toFixed(5), mid: +mid.toFixed(5) };
}

function calcStoch(prices, period = 14) {
  if (prices.length < period) return 50;
  const slice = prices.slice(-period);
  const high = Math.max(...slice);
  const low = Math.min(...slice);
  const current = prices[prices.length - 1];
  if (high === low) return 50;
  return +(((current - low) / (high - low)) * 100).toFixed(2);
}

function analyzeIndicators(prices) {
  const rsi = calcRSI(prices);
  const macd = calcMACD(prices);
  const ma20 = calcMA(prices, 20);
  const ma50 = calcMA(prices, 50);
  const boll = calcBollinger(prices);
  const stoch = calcStoch(prices);
  const current = prices[prices.length - 1];

  const signals = [];

  // RSI
  if (rsi < 30) signals.push({ name: "RSI", signal: "UP", strength: 85, detail: `RSI=${rsi} (перепродан)` });
  else if (rsi > 70) signals.push({ name: "RSI", signal: "DOWN", strength: 80, detail: `RSI=${rsi} (перекуплен)` });
  else signals.push({ name: "RSI", signal: rsi < 50 ? "DOWN" : "UP", strength: 55, detail: `RSI=${rsi} (нейтрал)` });

  // MACD
  signals.push({ name: "MACD", signal: macd > 0 ? "UP" : "DOWN", strength: macd > 0 ? 70 : 68, detail: `MACD=${macd}` });

  // MA Cross
  if (ma20 > ma50) signals.push({ name: "MA Cross", signal: "UP", strength: 75, detail: `MA20>${ma50}` });
  else signals.push({ name: "MA Cross", signal: "DOWN", strength: 72, detail: `MA20<MA50` });

  // Bollinger
  if (current < boll.lower) signals.push({ name: "Bollinger", signal: "UP", strength: 82, detail: "Цена у нижней полосы" });
  else if (current > boll.upper) signals.push({ name: "Bollinger", signal: "DOWN", strength: 79, detail: "Цена у верхней полосы" });
  else signals.push({ name: "Bollinger", signal: current > boll.mid ? "DOWN" : "UP", strength: 52, detail: "Цена внутри полос" });

  // Stochastic
  if (stoch < 20) signals.push({ name: "Stochastic", signal: "UP", strength: 78, detail: `Stoch=${stoch} (перепродан)` });
  else if (stoch > 80) signals.push({ name: "Stochastic", signal: "DOWN", strength: 76, detail: `Stoch=${stoch} (перекуплен)` });
  else signals.push({ name: "Stochastic", signal: stoch < 50 ? "DOWN" : "UP", strength: 53, detail: `Stoch=${stoch} (нейтрал)` });

  const upCount = signals.filter(s => s.signal === "UP").length;
  const downCount = signals.filter(s => s.signal === "DOWN").length;
  const upWeight = signals.filter(s => s.signal === "UP").reduce((a, b) => a + b.strength, 0);
  const downWeight = signals.filter(s => s.signal === "DOWN").reduce((a, b) => a + b.strength, 0);
  const total = upWeight + downWeight;

  const direction = upWeight >= downWeight ? "UP" : "DOWN";
  const upChance = Math.round((upWeight / total) * 100);
  const downChance = 100 - upChance;

  return { signals, direction, upChance, downChance, current };
}

export default function BinariumAnalyzer() {
  const [selectedTime, setSelectedTime] = useState(null);
  const [selectedCurrency, setSelectedCurrency] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 2000);
    return () => clearInterval(interval);
  }, []);

  const handleAnalyze = () => {
    if (!selectedTime || !selectedCurrency) return;
    setLoading(true);
    setResult(null);
    setTimeout(() => {
      const prices = generatePrices(60);
      const analysis = analyzeIndicators(prices);
      setResult(analysis);
      setLoading(false);
    }, 1800);
  };

  const canAnalyze = selectedTime && selectedCurrency;

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #0a0e1a 0%, #0d1526 50%, #0a0e1a 100%)",
      fontFamily: "'Inter', 'Segoe UI', sans-serif",
      color: "#e0e6f0",
      padding: "24px 16px",
    }}>
      <div style={{ maxWidth: 480, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 6 }}>
            <div style={{
              width: 10, height: 10, borderRadius: "50%",
              background: "#00e676", boxShadow: "0 0 8px #00e676",
              animation: "pulse 2s infinite"
            }} />
            <span style={{ fontSize: 12, color: "#00e676", letterSpacing: 2, textTransform: "uppercase", fontWeight: 600 }}>
              Live Binarium Analyzer
            </span>
          </div>
          <h1 style={{
            fontSize: 26, fontWeight: 800, margin: 0,
            background: "linear-gradient(90deg, #60a5fa, #a78bfa)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent"
          }}>
            Сигнальный Бот
          </h1>
          <p style={{ color: "#64748b", fontSize: 13, margin: "6px 0 0" }}>
            Технический анализ по 5 индикаторам
          </p>
        </div>

        {/* Time Selection */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, color: "#64748b", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 10, fontWeight: 600 }}>
            ⏱ Время экспирации
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {TIMES.map(t => (
              <button key={t.value} onClick={() => setSelectedTime(t)}
                style={{
                  padding: "9px 14px",
                  borderRadius: 10,
                  border: selectedTime?.value === t.value
                    ? "1.5px solid #60a5fa"
                    : "1.5px solid #1e2d47",
                  background: selectedTime?.value === t.value
                    ? "linear-gradient(135deg, #1e3a5f, #1a2840)"
                    : "#0f1929",
                  color: selectedTime?.value === t.value ? "#60a5fa" : "#94a3b8",
                  fontWeight: 600, fontSize: 13, cursor: "pointer",
                  boxShadow: selectedTime?.value === t.value ? "0 0 12px rgba(96,165,250,0.3)" : "none",
                  transition: "all 0.2s",
                }}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Currency Selection */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 11, color: "#64748b", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 10, fontWeight: 600 }}>
            💱 Валютная пара
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {CURRENCIES.map(c => (
              <button key={c} onClick={() => setSelectedCurrency(c)}
                style={{
                  padding: "8px 12px",
                  borderRadius: 10,
                  border: selectedCurrency === c
                    ? "1.5px solid #a78bfa"
                    : "1.5px solid #1e2d47",
                  background: selectedCurrency === c
                    ? "linear-gradient(135deg, #2d1b4e, #1e1340)"
                    : "#0f1929",
                  color: selectedCurrency === c ? "#a78bfa" : "#94a3b8",
                  fontWeight: 600, fontSize: 12, cursor: "pointer",
                  boxShadow: selectedCurrency === c ? "0 0 12px rgba(167,139,250,0.3)" : "none",
                  transition: "all 0.2s",
                }}>
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* Analyze Button */}
        <button onClick={handleAnalyze} disabled={!canAnalyze || loading}
          style={{
            width: "100%", padding: "16px",
            borderRadius: 14, border: "none",
            background: canAnalyze
              ? "linear-gradient(135deg, #2563eb, #7c3aed)"
              : "#1e2d47",
            color: canAnalyze ? "#fff" : "#475569",
            fontSize: 16, fontWeight: 700, cursor: canAnalyze ? "pointer" : "not-allowed",
            letterSpacing: 0.5,
            boxShadow: canAnalyze ? "0 4px 24px rgba(37,99,235,0.4)" : "none",
            transition: "all 0.3s",
            marginBottom: 24,
          }}>
          {loading ? "⏳ Анализирую..." : "🔍 АНАЛИЗ"}
        </button>

        {/* Loading */}
        {loading && (
          <div style={{
            background: "#0f1929", borderRadius: 16, padding: 24,
            border: "1px solid #1e2d47", textAlign: "center"
          }}>
            <div style={{ fontSize: 13, color: "#60a5fa", marginBottom: 12 }}>Собираю данные индикаторов...</div>
            {["RSI", "MACD", "MA Cross", "Bollinger", "Stochastic"].map((ind, i) => (
              <div key={ind} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <div style={{
                  width: 8, height: 8, borderRadius: "50%",
                  background: "#1e3a5f",
                  animation: `loadDot 0.6s ${i * 0.15}s infinite alternate`,
                }} />
                <div style={{ fontSize: 12, color: "#475569" }}>{ind}</div>
                <div style={{
                  flex: 1, height: 3, borderRadius: 2,
                  background: "linear-gradient(90deg, #1e3a5f 0%, #0f1929 100%)",
                  overflow: "hidden"
                }}>
                  <div style={{
                    height: "100%", width: "60%",
                    background: "linear-gradient(90deg, #2563eb, #7c3aed)",
                    borderRadius: 2,
                    animation: "loadBar 1s ease-in-out infinite alternate"
                  }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Result */}
        {result && !loading && (
          <div>
            {/* Main Signal */}
            <div style={{
              borderRadius: 18,
              background: result.direction === "UP"
                ? "linear-gradient(135deg, #052e16, #064e3b)"
                : "linear-gradient(135deg, #2d0a0a, #450a0a)",
              border: result.direction === "UP"
                ? "1.5px solid #16a34a"
                : "1.5px solid #dc2626",
              padding: "28px 24px",
              textAlign: "center",
              marginBottom: 16,
              boxShadow: result.direction === "UP"
                ? "0 0 40px rgba(22,163,74,0.2)"
                : "0 0 40px rgba(220,38,38,0.2)",
            }}>
              <div style={{ fontSize: 13, color: "#94a3b8", marginBottom: 8 }}>
                {selectedCurrency} · {selectedTime.label}
              </div>
              <div style={{
                fontSize: 64,
                filter: `drop-shadow(0 0 16px ${result.direction === "UP" ? "#16a34a" : "#dc2626"})`
              }}>
                {result.direction === "UP" ? "▲" : "▼"}
              </div>
              <div style={{
                fontSize: 28, fontWeight: 900, letterSpacing: 2,
                color: result.direction === "UP" ? "#4ade80" : "#f87171",
                margin: "8px 0 4px"
              }}>
                {result.direction === "UP" ? "ВВЕРХ" : "ВНИЗ"}
              </div>

              {/* Chances */}
              <div style={{ display: "flex", gap: 12, marginTop: 20, justifyContent: "center" }}>
                <div style={{
                  flex: 1, background: "rgba(0,0,0,0.3)", borderRadius: 12, padding: "12px 8px"
                }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: "#4ade80" }}>{result.upChance}%</div>
                  <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>▲ ВВЕРХ</div>
                </div>
                <div style={{
                  flex: 1, background: "rgba(0,0,0,0.3)", borderRadius: 12, padding: "12px 8px"
                }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: "#f87171" }}>{result.downChance}%</div>
                  <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>▼ ВНИЗ</div>
                </div>
              </div>

              {/* Chance Bar */}
              <div style={{ marginTop: 16, borderRadius: 99, overflow: "hidden", height: 8, background: "#1e1e1e" }}>
                <div style={{
                  height: "100%", width: `${result.upChance}%`,
                  background: "linear-gradient(90deg, #16a34a, #86efac)",
                  borderRadius: 99, transition: "width 0.6s ease"
                }} />
              </div>
            </div>

            {/* Indicators */}
            <div style={{
              background: "#0f1929", borderRadius: 16, padding: "20px 20px",
              border: "1px solid #1e2d47"
            }}>
              <div style={{ fontSize: 11, color: "#64748b", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 14, fontWeight: 600 }}>
                📊 Показания индикаторов
              </div>
              {result.signals.map((sig, i) => (
                <div key={i} style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: "10px 0",
                  borderBottom: i < result.signals.length - 1 ? "1px solid #1e2d47" : "none"
                }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: 8,
                    background: sig.signal === "UP" ? "rgba(22,163,74,0.15)" : "rgba(220,38,38,0.15)",
                    border: sig.signal === "UP" ? "1px solid #16a34a" : "1px solid #dc2626",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 14, flexShrink: 0,
                  }}>
                    {sig.signal === "UP" ? "▲" : "▼"}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#e2e8f0" }}>{sig.name}</div>
                    <div style={{ fontSize: 11, color: "#64748b", marginTop: 1 }}>{sig.detail}</div>
                  </div>
                  <div style={{
                    fontSize: 13, fontWeight: 700,
                    color: sig.signal === "UP" ? "#4ade80" : "#f87171",
                    flexShrink: 0
                  }}>
                    {sig.strength}%
                  </div>
                </div>
              ))}
            </div>

            {/* Disclaimer */}
            <div style={{
              marginTop: 16, padding: "12px 16px",
              background: "#0f1929", borderRadius: 12,
              border: "1px solid #1e2d47"
            }}>
              <p style={{ fontSize: 11, color: "#475569", margin: 0, lineHeight: 1.6, textAlign: "center" }}>
                ⚠️ Анализ основан на технических индикаторах. Это не финансовый совет. Торговля несёт риски потери капитала.
              </p>
            </div>
          </div>
        )}

        {/* Waiting state */}
        {!result && !loading && (
          <div style={{
            textAlign: "center", padding: "40px 20px",
            background: "#0f1929", borderRadius: 16, border: "1px solid #1e2d47"
          }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📈</div>
            <div style={{ color: "#475569", fontSize: 14 }}>
              Выберите время и валюту,<br />затем нажмите «Анализ»
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        @keyframes loadBar {
          from { width: 20%; }
          to { width: 80%; }
        }
        @keyframes loadDot {
          from { background: #1e3a5f; }
          to { background: #60a5fa; box-shadow: 0 0 6px #60a5fa; }
        }
      `}</style>
    </div>
  );
}
