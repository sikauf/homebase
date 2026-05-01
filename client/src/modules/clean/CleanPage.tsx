import BinaryDayCalendar from '../../components/BinaryDayCalendar'

export default function CleanPage() {
  return (
    <BinaryDayCalendar
      title="Clean"
      endpoint="/api/clean/days"
      accentRgb="74,222,128"
      primaryApiState="clean"
      secondary={{ accentRgb: '251,191,36', apiState: 'gold' }}
      countLabel={(n) => `${n} ${n === 1 ? 'day' : 'days'} clean`}
    />
  )
}
