import BinaryDayCalendar from '../../components/BinaryDayCalendar'

export default function RangePage() {
  return (
    <BinaryDayCalendar
      title="Range"
      endpoint="/api/golf/range-days"
      accentRgb="251,191,36"
      countLabel={(n) => `${n} ${n === 1 ? 'day' : 'days'} at the range`}
    />
  )
}
