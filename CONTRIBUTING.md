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
3. Create a new tag using Semantic Versioning rules.
   1. [Semantic Versioning guidelines](https://semver.org/) entail a format of M.m.p, for example 1.2.3, where:
      1. The first number represents a major release, which lets users know a breaking change has occurred that will require action from them.
         1. A major update in the AblyJS SDK will also require a major update in the Spaces API.
      2. The second number represents a minor release, which lets users know new functionality or features have been added.
      3. The third number represents a patch release, which represents bug-fixes and may be used when no action should be required from users.
4. Update the version number in `Spaces.ts` to match the new version.  
5. Ensure that the GitHub release action (.github/workflows/release.yml) has run successfully.  

## Test suite

To run the Jest tests, simply run the following command:

  npm test
