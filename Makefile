# Copyright (c) 2025 by Nathan S. Bushman. Licensed under GPL v3.
.PHONY: build clean install setup debug

zip = gnomouse@example.com.zip

build: node_modules $(zip)

node_modules: package.json
	npm install

install: $(zip)
	@echo "=== Pre-install checks ==="
	@echo "Checking zip file:"
	file $(zip)
	@echo "\nChecking GNOME Shell version:"
	gnome-shell --version
	@echo "\nChecking extension installation directory:"
	ls -la ~/.local/share/gnome-shell/extensions/ || true
	@echo "\nAttempting installation..."
	gnome-extensions uninstall gnomouse@example.com || rm -rf ~/.local/share/gnome-shell/extensions/gnomouse@example.com/
	gnome-extensions install --force $(zip)
	@echo "\nChecking post-install status:"
	ls -la ~/.local/share/gnome-shell/extensions/gnomouse@example.com/ || true
	gnome-extensions enable gnomouse@example.com || true
	@echo "\nListing all extensions:"
	gnome-extensions list
	echo "Extension installed. Please restart GNOME Shell:"
	echo "  - On X11: Alt+F2, r, Enter"
	echo "  - On Wayland: Log out and back in"

clean:
	npm run clean
	rm -f $(zip)
	rm -rf ~/.local/share/gnome-shell/extensions/gnomouse@example.com/

$(zip): $(wildcard src/*)
	@echo "=== Running checks ==="
	npm run check || (echo "Prettier check failed. Running format to show issues:" && npm run format)
	@echo "\n=== Building extension ==="
	npm run build
	@echo "\n=== Creating zip file ==="
	(cd build && zip -r - *) > $@

debug:
	@echo "=== Zip contents ==="
	unzip -l $(zip)
	@echo "\n=== Extension directory ==="
	ls -la ~/.local/share/gnome-shell/extensions/gnomouse@example.com/ || true
	@echo "\n=== Build directory ==="
	ls -la build/
	@echo "\n=== Schema compilation test ==="
	glib-compile-schemas --strict --dry-run build/schemas/
	@echo "\n=== Extension version ==="
	gnome-shell --version

setup:
	@echo "=== Current settings ==="
	@echo -n "User extensions enabled: "
	@gsettings get org.gnome.shell disable-user-extensions
	@echo -n "Development tools enabled: "
	@gsettings get org.gnome.shell development-tools
	@echo "\n=== Enabling development mode ==="
	gsettings set org.gnome.shell disable-user-extensions false
	gsettings set org.gnome.shell development-tools true
	@echo "\n=== New settings ==="
	@echo -n "User extensions enabled: "
	@gsettings get org.gnome.shell disable-user-extensions
	@echo -n "Development tools enabled: "
	@gsettings get org.gnome.shell development-tools
	@echo "Development mode enabled. You can now install local extensions." 