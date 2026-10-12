import React from 'react';

/**
 * Renders one simulator message's text: each `\n` becomes a line break and each
 * `*word*` run is bold (WhatsApp's own markup). `text` is the message body.
 */
/** @type {React.FC<{ text: string }>} */
const FormatMsg = ({ text }) => {
  const lines = text.split('\n');
  return (
    <>
      {lines.map((line, li) => {
        const parts = line.split(/(\*[^*]+\*)/g);
        // Keys are positions on purpose: `lines` and `parts` are re-derived from the
        // immutable `text` prop on every render (never edited, reordered or filtered
        // independently), they hold no state, and their content can repeat (blank
        // lines, the same word twice), so position is the only unique identity.
        return (
          // eslint-disable-next-line react/no-array-index-key -- line position within an immutable message text; lines can repeat
          <React.Fragment key={li}>
            {parts.map((p, pi) =>
              p.startsWith('*') && p.endsWith('*') ? (
                // eslint-disable-next-line react/no-array-index-key -- segment position within an immutable line; segments can repeat
                <strong key={pi}>{p.slice(1, -1)}</strong>
              ) : (
                // eslint-disable-next-line react/no-array-index-key -- segment position within an immutable line; segments can repeat
                <span key={pi}>{p}</span>
              )
            )}
            {li < lines.length - 1 && <br />}
          </React.Fragment>
        );
      })}
    </>
  );
};

export default FormatMsg;
