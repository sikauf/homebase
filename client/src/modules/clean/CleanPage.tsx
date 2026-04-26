import BinaryDayCalendar from '../../components/BinaryDayCalendar'

export default function CleanPage() {
  return (
    <BinaryDayCalendar
      title="Clean"
      endpoint="/api/clean/days"
      accentRgb="74,222,128"
      countLabel={(n) => `${n} ${n === 1 ? 'day' : 'days'} clean`}
    />
  )
}
