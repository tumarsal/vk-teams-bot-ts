.PHONY: tag

# Create next semver patch tag based on latest vX.Y.Z tag.
# Example: v1.2.3 -> v1.2.4 ; if no tags exist -> v0.0.1
tag:
	@set -euo pipefail; \
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
	echo "$$next_tag"; \
	git tag "$$next_tag"; \
	echo "Created tag $$next_tag"
