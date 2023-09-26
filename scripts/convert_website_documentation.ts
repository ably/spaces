import { readdir, lstat, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { execFile } from 'node:child_process';

async function processDirectory(path: string) {
  const entries = await readdir(path);

  for (const entry of entries) {
    const pathToEntry = join(path, entry);

    const stat = await lstat(pathToEntry);
    if (stat.isDirectory()) {
      await processDirectory(pathToEntry);
      continue;
    }

    if (entry.endsWith('.ts')) {
      await processFile(pathToEntry);
    }
  }
}

async function processFile(path: string) {
  console.log(`Processing: ${path}`);
  const contents = await readFile(path, { encoding: 'utf-8' });

  const beginWebsiteDocumentationRegexp = /<!-- BEGIN WEBSITE DOCUMENTATION \(.*\) -->/g;
  const endWebsiteDocumentationRegexp = /<!-- END WEBSITE DOCUMENTATION -->/g;

  const lines = contents.split('\n');

  const startLineIndices: number[] = [];
  const endLineIndices: number[] = [];

  for (const [lineIndex, line] of lines.entries()) {
    if (beginWebsiteDocumentationRegexp.exec(line)) {
      startLineIndices.push(lineIndex);
    }
    if (endWebsiteDocumentationRegexp.exec(line)) {
      endLineIndices.push(lineIndex);
    }
  }

  for (let documentationIndex = 0; documentationIndex < startLineIndices.length; documentationIndex++) {
    const startLineIndex = startLineIndices[documentationIndex];
    const endLineIndex = endLineIndices[documentationIndex];

    const documentation = lines.slice(startLineIndex + 1, endLineIndex).join('\n');
    const documentationLineCount = endLineIndex - startLineIndex - 1;

    // Convert the documentation comment.
    const converted = await convertWebsiteDocumentationCommentFragment(documentation);

    // Replace the documentation comment in `lines`.
    const convertedLines = converted.split('\n');
    lines.splice(startLineIndex + 1, documentationLineCount, ...convertedLines);

    const addedLinesCount = convertedLines.length - documentationLineCount;

    // Shift the line indices to reflect the length of the converted documentation comment.
    for (
      let indexOfDocumentationToShiftLineNumbers = documentationIndex + 1;
      indexOfDocumentationToShiftLineNumbers < startLineIndices.length;
      indexOfDocumentationToShiftLineNumbers++
    ) {
      startLineIndices[indexOfDocumentationToShiftLineNumbers] += addedLinesCount;
      endLineIndices[indexOfDocumentationToShiftLineNumbers] += addedLinesCount;
    }
  }

  // Write the new contents of the file.
  const newContents = lines.join('\n');
  await writeFile(path, newContents, { encoding: 'utf-8' });
}

async function convertWebsiteDocumentationCommentFragment(commentFragment: string) {
  const prefixStrippingResult = strippingPrefixOfCommentFragment(commentFragment);
  const tagged = tagCommentFragmentLines(prefixStrippingResult.content);

  const lines: string[] = [];

  for (const taggedLines of tagged) {
    switch (taggedLines.type) {
      case 'textile':
        lines.push(...(await convertTextileLines(taggedLines.lines)));
        break;
      case 'codeBlock':
        lines.push(...convertCodeBlockLines(taggedLines.lines));
        break;
    }
  }

  return restoringPrefixOfCommentFragment(lines.join('\n'), prefixStrippingResult.prefix);
}

async function convertTextileLines(textileLines: string[]) {
  const pandocStdoutPromise = new Promise<string>((resolve, reject) => {
    const childProcess = execFile(
      '/opt/homebrew/bin/pandoc',
      // We choose gfm over commonmark for tables support.
      ['--from', 'textile', '--to', 'gfm', '--wrap=preserve'],
      (error, stdout, stderr) => {
        if (error) {
          reject(error);
        } else {
          resolve(stdout);
        }
      },
    );

    // I don’t fully understand how writing works and whether this always succeeds in writing the full thing; keep an eye out for any weirdness and revisit if necessary.
    childProcess.stdin!.write(textileLines.join('\n'));
    childProcess.stdin!.end();
  });

  const pandocStdout = await pandocStdoutPromise;

  return pandocStdout.split('\n');
}

function convertCodeBlockLines(codeBlockLines: string[]) {
  // remove square brackets from language tag
  const firstLine = codeBlockLines[0].replace(/[[\]]/g, '');
  return [firstLine, ...codeBlockLines.slice(1)];
}

type TaggedLines = { type: 'textile' | 'codeBlock'; lines: string[] };

function tagCommentFragmentLines(commentFragment: string) {
  const lines = commentFragment.split('\n');

  const result: TaggedLines[] = [];

  let current: TaggedLines | null = null;

  for (const line of lines) {
    if (line.startsWith('```')) {
      if (current && current.type === 'codeBlock') {
        // end of code block
        current.lines.push(line);
        result.push(current);
        current = null;
      } else {
        if (current) {
          result.push(current);
        }

        // start of code block
        current = { type: 'codeBlock', lines: [line] };
      }
    } else {
      if (current) {
        current.lines.push(line);
      } else {
        current = { type: 'textile', lines: [line] };
      }
    }
  }

  if (current) {
    result.push(current);
    current = null;
  }

  return result;
}

function strippingPrefixOfCommentFragment(commentFragment: string) {
  const lines = commentFragment.split('\n');
  const prefix = /\s+\* /g.exec(lines[0])![0];
  const newLines = lines.map((line) => line.substring(prefix.length));

  return { content: newLines.join('\n'), prefix };
}

function restoringPrefixOfCommentFragment(content: string, prefix: string) {
  const lines = content.split('\n');
  const newLines = lines.map((line) => `${prefix}${line}`);

  return newLines.join('\n');
}

processDirectory('src');
