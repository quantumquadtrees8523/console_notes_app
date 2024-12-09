import sanitizeHtml from "sanitize-html";
import sanitizeUrl from "@braintree/sanitize-url";
import optionService from "./options.js";

// Default list of allowed HTML tags
export const DEFAULT_ALLOWED_TAGS = [
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'p', 'a', 'ul', 'ol',
    'li', 'b', 'i', 'strong', 'em', 'strike', 's', 'del', 'abbr', 'code', 'hr', 'br', 'div',
    'table', 'thead', 'caption', 'tbody', 'tfoot', 'tr', 'th', 'td', 'pre', 'section', 'img',
    'figure', 'figcaption', 'span', 'label', 'input', 'details', 'summary', 'address', 'aside', 'footer',
    'header', 'hgroup', 'main', 'nav', 'dl', 'dt', 'menu', 'bdi', 'bdo', 'dfn', 'kbd', 'mark', 'q', 'time',
    'var', 'wbr', 'area', 'map', 'track', 'video', 'audio', 'picture', 'del', 'ins',
    'en-media', // for ENEX import
    // Additional tags (https://github.com/TriliumNext/Notes/issues/567)
    'acronym', 'article', 'big', 'button', 'cite', 'col', 'colgroup', 'data', 'dd',
    'fieldset', 'form', 'legend', 'meter', 'noscript', 'option', 'progress', 'rp',
    'samp', 'small', 'sub', 'sup', 'template', 'textarea', 'tt'
] as const;

// intended mainly as protection against XSS via import
// secondarily, it (partly) protects against "CSS takeover"
// sanitize also note titles, label values etc. - there are so many usages which make it difficult
// to guarantee all of them are properly handled
function sanitize(dirtyHtml: string) {
    if (!dirtyHtml) {
        return dirtyHtml;
    }

    // avoid H1 per https://github.com/zadam/trilium/issues/1552
    // demote H1, and if that conflicts with existing H2, demote that, etc
    const transformTags: Record<string, string> = {};
    const lowercasedHtml = dirtyHtml.toLowerCase();
    for (let i = 1; i < 6; ++i) {
        if (lowercasedHtml.includes(`<h${i}`)) {
            transformTags[`h${i}`] = `h${i + 1}`;
        }
        else {
            break;
        }
    }

    // Get allowed tags from options, with fallback to default list if option not yet set
    let allowedTags;
    try {
        allowedTags = JSON.parse(optionService.getOption('allowedHtmlTags'));
    } catch (e) {
        // Fallback to default list if option doesn't exist or is invalid
        allowedTags = DEFAULT_ALLOWED_TAGS;
    }

    // to minimize document changes, compress H
    return sanitizeHtml(dirtyHtml, {
        allowedTags,
        allowedAttributes: {
            "*": [ 'class', 'style', 'title', 'src', 'href', 'hash', 'disabled', 'align', 'alt', 'center', 'data-*' ],
            "input": [ "type", "checked" ]
        },
        // Be consistent with `allowedSchemes` in `src\public\app\services\link.js`
        allowedSchemes: [
            'http', 'https', 'ftp', 'ftps', 'mailto', 'data', 'evernote', 'file', 'facetime', 'gemini', 'git',
            'gopher', 'imap', 'irc', 'irc6', 'jabber', 'jar', 'lastfm', 'ldap', 'ldaps', 'magnet', 'message',
            'mumble', 'nfs', 'onenote', 'pop', 'rmi', 's3', 'sftp', 'skype', 'sms', 'spotify', 'steam', 'svn', 'udp',
            'view-source', 'vlc', 'vnc', 'ws', 'wss', 'xmpp', 'jdbc', 'slack', 'tel', 'smb', 'zotero'
        ],
        nonTextTags: [
            'head'
        ],
        transformTags
    });
}

export default {
    sanitize,
    sanitizeUrl: (url: string) => {
        return sanitizeUrl.sanitizeUrl(url).trim();
    }
};
