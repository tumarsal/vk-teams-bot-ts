.PHONY: tag

# Create next semver patch tag based on latest vX.Y.Z tag.
# Example: v1.2.3 -> v1.2.4 ; if no tags exist -> v0.0.1
tag:
	@set -euo pipefail; \
	remote="$$(git remote | head -n 1)"; \
	if [ -z "$$remote" ]; then \
		echo "No git remotes configured"; \
		exit 1; \
	fi; \
	git fetch "$$remote" --tags >/dev/null; \
	last_tag="$$(git tag -l 'v*' --sort=-v:refname | head -n 1)"; \
	if [ -z "$$last_tag" ]; then \
		next_tag="v0.0.1"; \
	else \
		ver="$${last_tag#v}"; \
		IFS='.' read -r major minor patch <<< "$$ver"; \
		if [ -z "$$major" ] || [ -z "$$minor" ] || [ -z "$$patch" ]; then \
			echo "Unexpected tag format: $$last_tag (expected vX.Y.Z)"; \
			exit 1; \
		fi; \
		next_tag="v$${major}.$${minor}.$$((patch + 1))"; \
	fi; \
	if git rev-parse "$$next_tag" >/dev/null 2>&1; then \
		echo "Tag already exists: $$next_tag"; \
		exit 1; \
	fi; \
	echo "$$next_tag"; \
	git tag "$$next_tag"; \
	git push "$$remote" "$$next_tag"; \
	echo "Created and pushed tag $$next_tag to $$remote"
