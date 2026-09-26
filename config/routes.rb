Rails.application.routes.draw do
  get "up" => "rails/health#show", as: :rails_health_check

  root "calendars#index"

  resources :calendars, only: %i[index new show create update destroy] do
    post :duplicate, on: :member
  end

  resources :tags, only: %i[index create update destroy]
  get "holidays", to: "holidays#index"
end
