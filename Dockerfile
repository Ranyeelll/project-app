FROM php:8.4-cli

# Install system dependencies
RUN apt-get update && apt-get install -y \
    git curl zip unzip libpq-dev libzip-dev libpng-dev libjpeg-dev libfreetype6-dev \
    nodejs npm \
    && docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install pdo pdo_pgsql pgsql zip gd bcmath \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Install Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

WORKDIR /app

# Copy composer files and install PHP dependencies
COPY composer.json composer.lock ./
RUN composer install --no-dev --optimize-autoloader --no-scripts --no-interaction

# Copy package files and install Node dependencies + build
COPY package.json package-lock.json* ./
RUN npm ci

# Copy the rest of the application
COPY . .

# Run composer scripts (post-autoload-dump etc.)
RUN composer run-script post-autoload-dump

# Build frontend assets
RUN npm run build

# Cache views only (config/route cache at runtime when env vars are available)
RUN php artisan view:cache

# Start script: cache config, run migrations, seed, link storage, then serve
CMD php artisan config:cache && \
    php artisan route:cache && \
    php artisan migrate --force && \
    php artisan db:seed --force && \
    php artisan storage:link 2>/dev/null; \
    php artisan serve --host=0.0.0.0 --port=${PORT:-8080}
