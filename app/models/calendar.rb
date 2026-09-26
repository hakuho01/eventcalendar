class Calendar < ApplicationRecord
  DEFAULT_SETTINGS = {
    "showHeader" => true,
    "closedWeekdays" => [ 3, 4 ],
    "weekendDateColor" => true,
    "holidayDateColor" => true,
    "condenseText" => true
  }.freeze

  validates :year, presence: true, numericality: { in: 2000..2100 }
  validates :month, presence: true, numericality: { in: 1..12 }
  validates :title, length: { maximum: 80 }

  before_validation :apply_defaults

  def self.default_title(year, month)
    "#{month}月大会スケジュール"
  end

  def self.build_new(year:, month:)
    new(
      title: default_title(year, month),
      year: year,
      month: month,
      settings: DEFAULT_SETTINGS.deep_dup,
      days: {}
    )
  end

  def as_editor_json
    {
      id: id,
      title: title,
      year: year,
      month: month,
      settings: DEFAULT_SETTINGS.merge(settings || {}),
      days: days || {},
      updatedAt: updated_at&.iso8601
    }
  end

  private

  def apply_defaults
    self.settings = DEFAULT_SETTINGS.merge(settings || {})
    self.days ||= {}
    self.title = self.class.default_title(year, month) if title.blank? && year && month
  end
end
