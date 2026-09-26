class ApplicationController < ActionController::Base
  stale_when_importmap_changes

  before_action :authenticate_with_optional_basic_auth

  private

  def authenticate_with_optional_basic_auth
    return if ENV["APP_PASSWORD"].blank?

    authenticate_or_request_with_http_basic("Event Calendar Maker") do |user, password|
      ActiveSupport::SecurityUtils.secure_compare(user, ENV.fetch("APP_USERNAME", "admin")) &
        ActiveSupport::SecurityUtils.secure_compare(password, ENV["APP_PASSWORD"])
    end
  end
end
