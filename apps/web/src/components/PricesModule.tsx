import PriceWidget from './PriceWidget'

export default function PricesModule() {
  return (
    <div className="grid">
      <PriceWidget symbol="BTC" />
      <PriceWidget symbol="ETH" />
      <PriceWidget symbol="DOGE" />
    </div>
  )
}

