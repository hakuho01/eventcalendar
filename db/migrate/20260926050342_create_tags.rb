class CreateTags < ActiveRecord::Migration[8.1]
  def change
    create_table :tags do |t|
      t.string :name, null: false
      t.string :bg_color, null: false, default: "#F5D000"
      t.string :text_color, null: false, default: "#111111"

      t.timestamps
    end

    add_index :tags, :name, unique: true
  end
end
