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
1. Add a new commit using Semantic Versioning rules.
   1. [Semantic Versioning guidelines](https://semver.org/) entail a format of M.m.p, for example 1.2.3, where:
      - The first number represents a major release, which lets users know a breaking change has occurred that will require action from them.
      - A major update in the AblyJS SDK will also require a major update in the Spaces API.
      - The second number represents a minor release, which lets users know new functionality or features have been added.
      - The third number represents a patch release, which represents bug-fixes and may be used when no action should be required from users.
   1. The commit should update `package.json`, the `Spaces.ts` class containing a `version` property and `package-lock.json`.
      Running `npm install` after changing `package.json` will update `package-lock.json`.
   1. Update the README.md for any references to the new version, such as the CDN link.
1. Merge the commit into main.
1. Tag a release using [Github releases](https://docs.github.com/en/repositories/releasing-projects-on-github/managing-releases-in-a-repository#creating-a-release). The version needs to match the one from the commit. Use the "Generate release notes" button to
   add changelog notes and update as required.
1. Ensure that the GitHub release action (.github/workflows/release.yml) has run successfully and package was published.
1. Run the GitHub CDN publish action (.github/workflows/cdn.yml) with the same tag.

## Test suite

To run the Jest tests, simply run the following command:

```bash
npm test
```

### CDN bundle test

To test the bundle that we upload to the CDN:

1. Initialize submodules: `git submodule update --init`
2. Install browser for Playwright to use: `npx run playwright install chromium`
3. Build the bundle: `npm run build`
4. Run the test: `npm run test:cdn-bundle`
