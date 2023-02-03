# Contributing To Spaces API

## Contributing

1. Fork it
2. Create your feature branch (`git checkout -b my-new-feature`)
3. Commit your changes (`git commit -am 'Add some feature'`)
4. Ensure you have added suitable tests and the test suite is passing(`npm test`)
5. Push the branch (`git push origin my-new-feature`)
6. Create a new Pull Request

## Release Process

1. Make sure the tests are passing in CI for main
2. Update the CHANGELOG.md with any customer-affecting changes since the last release and add this to the git index
3. Run `npm version <VERSION_NUMBER>` with the new version and add the changes to the git index
4. Push the git tag created by `npm version` to the repository
5. Run `npm run build`
7. Run `npm publish .` (should require OTP) - publishes to NPM
8. Run the GitHub action "Publish to CDN" with the new tag name
9. Visit https://github.com/ably-labs/spaces/tags and add release notes to the release (generally you can just copy the notes you added to the CHANGELOG)

## Test suite

To run the Jest tests, simply run the following command:

    npm test
