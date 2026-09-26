class HolidaysController < ApplicationController
  def index
    year = params[:year].to_i
    month = params[:month].to_i
    return render json: { errors: [ "年月を指定してください" ] }, status: :unprocessable_entity unless year.between?(2000, 2100) && month.between?(1, 12)

    render json: HolidayDirectory.in_month(year, month)
  end
end
