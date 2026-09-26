# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[8.1].define(version: 2026_09_26_050342) do
  # These are extensions that must be enabled in order to support this database
  enable_extension "pg_catalog.plpgsql"

  create_table "calendars", force: :cascade do |t|
    t.string "title", default: "", null: false
    t.integer "year", null: false
    t.integer "month", null: false
    t.jsonb "settings", default: {}, null: false
    t.jsonb "days", default: {}, null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["updated_at"], name: "index_calendars_on_updated_at"
    t.index ["year", "month"], name: "index_calendars_on_year_and_month"
  end

  create_table "tags", force: :cascade do |t|
    t.string "name", null: false
    t.string "bg_color", default: "#F5D000", null: false
    t.string "text_color", default: "#111111", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["name"], name: "index_tags_on_name", unique: true
  end
end
