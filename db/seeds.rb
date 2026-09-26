[
  { name: "マンスリーカジュアル", bg_color: "#F5D000", text_color: "#111111" },
  { name: "WIXOSS", bg_color: "#2F6BFF", text_color: "#FFFFFF" }
].each do |attrs|
  Tag.find_or_create_by!(name: attrs[:name]) do |tag|
    tag.bg_color = attrs[:bg_color]
    tag.text_color = attrs[:text_color]
  end
end
