class CalendarsController < ApplicationController
  before_action :set_calendar, only: %i[show update destroy duplicate]

  def index
    @calendars = Calendar.order(updated_at: :desc)
  end

  def new
    year, month = parse_year_month
    @calendar = Calendar.build_new(year: year, month: month)
    Tag.ensure_defaults!
    @tags = Tag.order(:id)
    @holidays = HolidayDirectory.in_month(year, month)
    render :editor
  end

  def show
    Tag.ensure_defaults!
    @tags = Tag.order(:id)
    @holidays = HolidayDirectory.in_month(@calendar.year, @calendar.month)
    render :editor
  end

  def create
    calendar = Calendar.new(calendar_params)
    if calendar.save
      render json: calendar.as_editor_json, status: :created
    else
      render json: { errors: calendar.errors.full_messages }, status: :unprocessable_entity
    end
  end

  def update
    if @calendar.update(calendar_params)
      render json: @calendar.as_editor_json
    else
      render json: { errors: @calendar.errors.full_messages }, status: :unprocessable_entity
    end
  end

  def destroy
    @calendar.destroy!
    redirect_to calendars_path, notice: "カレンダーを削除しました"
  end

  def duplicate
    copy = @calendar.dup
    copy.title = "#{@calendar.title} のコピー"
    copy.save!
    redirect_to calendar_path(copy), notice: "コピーを作成しました"
  end

  private

  def set_calendar
    @calendar = Calendar.find(params[:id])
  end

  def calendar_params
    raw = params.require(:calendar)
    raw.permit(:title, :year, :month).merge(
      settings: raw[:settings].present? ? raw[:settings].to_unsafe_h : {},
      days: raw[:days].present? ? raw[:days].to_unsafe_h : {}
    )
  end

  def parse_year_month
    if params[:month].present? && params[:month].to_s.match?(/\A\d{4}-\d{2}\z/)
      y, m = params[:month].split("-").map(&:to_i)
      return [ y, m ]
    end

    year = params[:year].presence&.to_i || Date.current.year
    month = params[:month].presence&.to_i || Date.current.month
    [ year, month ]
  end
end
