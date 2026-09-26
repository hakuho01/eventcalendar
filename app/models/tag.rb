class Tag < ApplicationRecord
  DEFAULTS = [
    { name: "マンスリーカジュアル", bg_color: "#F5D000", text_color: "#111111" },
    { name: "WIXOSS", bg_color: "#2F6BFF", text_color: "#FFFFFF" }
  ].freeze

  validates :name, presence: true, uniqueness: true, length: { maximum: 30 }
  validates :bg_color, presence: true, format: { with: /\A#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})\z/ }
  validates :text_color, presence: true, format: { with: /\A#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})\z/ }

  def as_json(options = {})
    super(options.merge(only: [ :id, :name, :bg_color, :text_color ]))
  end

  def self.ensure_defaults!
    DEFAULTS.each do |attrs|
      find_or_create_by!(name: attrs[:name]) do |tag|
        tag.bg_color = attrs[:bg_color]
        tag.text_color = attrs[:text_color]
      end
    end
  end
end
