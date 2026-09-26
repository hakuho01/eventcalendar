class HolidayDirectory
  def self.in_month(year, month)
    start_date = Date.new(year, month, 1)
    HolidayJp.between(start_date, start_date.end_of_month).map do |holiday|
      {
        day: holiday.date.day,
        name: holiday.name,
        date: holiday.date.iso8601
      }
    end
  end
end
