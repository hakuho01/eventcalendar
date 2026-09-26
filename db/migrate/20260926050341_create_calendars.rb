class CreateCalendars < ActiveRecord::Migration[8.1]
  def change
    create_table :calendars do |t|
      t.string :title, null: false, default: ""
      t.integer :year, null: false
      t.integer :month, null: false
      t.jsonb :settings, null: false, default: {}
      t.jsonb :days, null: false, default: {}

      t.timestamps
    end

    add_index :calendars, [ :year, :month ]
    add_index :calendars, :updated_at
  end
end
