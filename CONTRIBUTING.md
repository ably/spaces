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
3. Create a new tag
4. Ensure that the GitHub release action (.github/workflows/release.yml) has run successfully 

## Test suite

To run the Jest tests, simply run the following command:

    npm test
