﻿chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {


    // gmail element selectors
    var emailHeaderSelector = '.kv',
        hiddenEmailHeaderSelector = '.kQ',
        emailBlockSelector = 'div.gs',
        senderElementSelector = 'h3 span.gD',
        recipientElementMeSelector = 'span.hb span.g2:contains("me")',
        recipientElementSelector = 'span.hb span.g2',
        linkSelector = 'a',
        calendarBlockLinkSelector = '.aHl a',
        headerBlockLinkSelector = '.iv a', 
        spanBlockLinkSelector = '.acS a',
        trimmedContentSelector = '.ajR',
        trimmedContentLinkSelector = '.adL a:hidden',
        attachmentParentClass = 'aZo',
        emailBodyElementSelector = 'div.a3s',
        attachmentsAreaSelector = 'div>:contains("Attachments area"), div>:contains(" Attachments")'

    // List of classes
    var suspiciousLinkClass = 'phishweb-suspicious-link',
        linkClass = 'phishweb-link',
        suspiciousAttachmentClass = 'phishweb-suspicious-attachment',
        suspiciousEmailBodyClass = 'phishweb-suspicious-email-body',
        emailBodyClass = 'phishweb-email-body',
        suspiciousBodyMessageClass = 'phishweb-suspicious-email-body-message',
        bodyMessageClass = 'phishweb-email-body-message',
        suspiciousAttachmentMessageClass = 'phishweb-reminder-attachments',
        suspiciousSenderMessageClass = 'phishweb-reminder-sender-address-suspicious',
        senderMessageClass = 'phishweb-reminder-sender-address';

    // PhishWeb warning messages
    var suspiciousBodyMessageHtml = '<div class="' + suspiciousBodyMessageClass + '"><span>Suspicious links or information found!</span></div>',
        bodyMessageHtml = '<div class="' + bodyMessageClass + '"><span>No suspicious links found!</span></div>',
        suspiciousAttachmentMessageHtml = '<span class="' + suspiciousAttachmentMessageClass + '"><br>** Make sure you know the sender and that the attachment\'s extension (.jpg, .png, etc) is familiar and expected. **</span>',
        suspiciousSenderMessageHtml = '<div class="' + suspiciousSenderMessageClass  + ' phishweb-sender-reminder"><br>** Make sure the email address above looks correct and is from who you expect. **</div>',
        senderMessageHtml = '<div class="' + senderMessageClass + ' phishweb-sender-reminder"><br>** Make sure the email address above looks correct and is from who you expect. **</div>';



    // helpful functions
    function log(message) 
    {
        //console.log(message);
    }
    function TextLooksLikeALink(url, text) 
    {
        if (text == null || text.length == 0) 
        {
            log('text looks like a link: false; no text');
            return false;
        }

        var urlRegex = /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig;
        var looksLikeALink = urlRegex.test(text)
            || text.indexOf('www.') > -1 || text.indexOf('.com') > -1
            || text.indexOf('.net') > -1 || text.indexOf('.org') > -1
            || text.indexOf('.co') > -1 || text.indexOf('/') > -1
            || (url.indexOf(text) > -1 && text.indexOf('.') > -1);

        log('text looks like a link: ' + looksLikeALink + '; text: ' + text);
        return looksLikeALink;
    }



    function getLinksFromEmailBlock(emailBlock) 
    {
        return $(emailBlock).find(linkSelector)
                        .not($(emailBlock).find(calendarBlockLinkSelector))
                        .not($(emailBlock).find(headerBlockLinkSelector))
                        .not($(emailBlock).find(spanBlockLinkSelector));
                        //.not($(emailBlock).find(trimmedContentLinkSelector));
    };
    function setRemindersAndColors(emailBlock, emailBodyElement, senderEmailBlock) 
    {
        var suspiciousLinkFound = false,
            suspiciousAttachmentFound = false;

        // what suspicious stuff did we find?
        if (emailBodyElement != null && ($(emailBodyElement).find('a.' + suspiciousLinkClass).not(':hidden').length > 0
            || $(emailBodyElement).find('.phishweb-suspicious-text').not(':hidden').length > 0)) {
            log('suspicious links found!');
            suspiciousLinkFound = true;
        }
        if ($(emailBlock).find('.' + suspiciousAttachmentClass).not(':hidden').length > 0) {
            log('suspicious attachments found!');
            suspiciousAttachmentFound = true;
        }

        // clear previously set header and body classes/messages before we set them
        // this allows us to run processing multiple times (expanding hidden sections, for example)
        if (emailBodyElement != null) {
            $(emailBodyElement).removeClass(suspiciousEmailBodyClass);
            $(emailBodyElement).removeClass(emailBodyClass);
        }
        $(emailBlock).find('.' + suspiciousBodyMessageClass).remove();
        $(emailBlock).find('.' + bodyMessageClass).remove();
        $(emailBlock).find('.' + suspiciousSenderMessageClass).remove();
        $(emailBlock).find('.' + senderMessageClass).remove();

        // set the email body class and message
        log('flagging email body');
        if (emailBodyElement != null) {
            if (!$(emailBodyElement).hasClass(suspiciousEmailBodyClass) && !$(emailBodyElement).hasClass(emailBodyClass)) {
                if (suspiciousLinkFound) {
                    $(emailBodyElement).addClass(suspiciousEmailBodyClass);
                    $(emailBodyElement).prepend(suspiciousBodyMessageHtml);
                }
                else {
                    $(emailBodyElement).addClass(emailBodyClass);
                    $(emailBodyElement).prepend(bodyMessageHtml);
                }
            }
        }

        // Reminder to check attachments
        log('flagging attachment section');
        if ($(emailBlock).find('.' + suspiciousAttachmentClass).length > 0) {
            var attachmentsArea = $(emailBlock).find(attachmentsAreaSelector);
            if (attachmentsArea != null && attachmentsArea.length > 0) {
                for (var iAttachmentsArea = 0; iAttachmentsArea < attachmentsArea.length; iAttachmentsArea++) {
                    var area = attachmentsArea[iAttachmentsArea];
                    if ($(emailBlock).find('.' + suspiciousAttachmentMessageClass).length == 0) {
                        $(area.parentElement).prepend(suspiciousAttachmentMessageHtml);
                    }
                }
            }
        }

        // Reminder to check the sender address
        log('flagging sender block');
        if (senderEmailBlock != null && ($(senderEmailBlock).find('.' + senderMessageClass).length == 0 && $(senderEmailBlock).find('.' + suspiciousSenderMessageClass).length == 0)) {
            if (suspiciousLinkFound || suspiciousAttachmentFound) {
                $(senderEmailBlock).append(suspiciousSenderMessageHtml);
            }
            else {
                $(senderEmailBlock).append(senderMessageHtml);
            }
        }
    }



    // MAIN PROCESSING FUNCTION
    function processOpenEmailSections() {
        log('processing email blocks');
        var emailBlocks = $(emailBlockSelector);
        if (emailBlocks != null && emailBlocks.length > 0) {
            for (var iBlocks = 0; iBlocks < emailBlocks.length; iBlocks++) {
                var emailBlock = emailBlocks[iBlocks],
                    emailBodyElement = $(emailBlock).find(emailBodyElementSelector);

                //if (!$(emailBlock).hasClass('phishweb-skipprocessing')) {
                    log('processing email block ' + (iBlocks + 1));


                    var senderEmailBlock = null,
                        senderEmail = null,
                        senderDomain = null,
                        senderSubdomain = null,
                        recipientEmail = null;


                    // sender info and area selection
                    log('finding sender info');
                    var senderElement = $(emailBlock).find(senderElementSelector);
                    if (senderElement != null && senderElement.length > 0 && senderElement[0].attributes.hasOwnProperty('email')) {
                        senderEmail = senderElement[0].attributes['email'].value;
                        senderEmailBlock = senderElement[0].parentElement;
                        log('sender email: ' + senderEmail);


                        if (senderEmail.indexOf('@') > -1) {
                            senderDomain = senderSubdomain = senderEmail.substring(senderEmail.indexOf('@') + 1);
                            var domainPieces = senderDomain.split('.');
                            if (domainPieces.length > 2) {
                                senderDomain = domainPieces[domainPieces.length - 2] + '.' + domainPieces[domainPieces.length - 1];
                            }
                        }
                        log('sender domain: ' + senderDomain);
                    }


                    // recipient info
                    log('finding recipient info');
                    var recipientElementMe = $(emailBlock).find(recipientElementMeSelector);
                    var recipientElement = $(emailBlock).find(recipientElementSelector); // in case I'm sending the email
                    if (recipientElementMe != null && recipientElementMe.length == 1) recipientElement = recipientElementMe;
                    if (recipientElement != null && recipientElement.length > 0 && recipientElement[0].attributes.hasOwnProperty('email')) {
                        recipientEmail = recipientElement[0].attributes['email'].value;
                        log('recipient email: ' + recipientEmail);
                    }

                    if (!$(emailBlock).hasClass('phishweb-skipprocessing')) {

                        // process each of the links in the email block
                        // we have to do this multiple times (while loop) because we replace the tags and it removes any embedded links
                        var iterations = 0;
                        var linksInBlock = getLinksFromEmailBlock(emailBlock);
                        while (linksInBlock.length > 0 && iterations < 5) {
                            log('processing links');
                            for (var iLink = 0; iLink < linksInBlock.length; iLink++) {
                                var link = linksInBlock[iLink],
                                    linkHref = link.href,
                                    linkDomain = null,
                                    linkParent = link.parentElement;

                                console.log('processing link: ' + linkHref);

                                // the link domain
                                if (linkHref != null && (linkHref.indexOf('http://') > -1 || linkHref.indexOf('https://') > -1)) {
                                    linkDomain = linkHref.replace('http://', '').replace('https://', '');
                                    if (linkDomain.indexOf('/') > -1) linkDomain = linkDomain.substring(0, linkDomain.indexOf('/'));

                                    var linkDomainPieces = linkDomain.split('.');
                                    if (linkDomainPieces.length > 2) {
                                        linkDomain = linkDomainPieces[linkDomainPieces.length - 2] + '.' + linkDomainPieces[linkDomainPieces.length - 1];
                                    }
                                }


                                // make the link suspicious unless we say otherwise
                                if (linkHref != null && linkHref.length > 0) $(link).addClass(suspiciousLinkClass);


                                // compare the link domain to the sender domain and remove the suspicious flag if they match
                                if (linkDomain != null && senderDomain.toLowerCase() == linkDomain.toLowerCase()) {
                                    $(link).removeClass(suspiciousLinkClass);
                                    $(link).addClass(linkClass);
                                }
                                // if the link is a mailto for the sender or recipient
                                // remove the suspicious flag and make it a regular link
                                if (linkHref != null && (linkHref.toLowerCase() == 'mailto:' + senderEmail.toLowerCase() || linkHref.toLowerCase() == 'mailto:' + recipientEmail.toLowerCase())) {
                                    $(link).removeClass(suspiciousLinkClass);
                                    $(link).addClass(linkClass);
                                }
                                // if the link parent has a download url, it is an attachment
                                // move the suscpicious flag to the parent
                                if (linkParent != null && (linkParent.attributes.hasOwnProperty('download_url') || $(linkParent).hasClass(attachmentParentClass))) {
                                    $(link).removeClass(suspiciousLinkClass);
                                    $(linkParent).addClass(suspiciousAttachmentClass);
                                }


                                // replace the link with a span (attachments stay as links)
                                // include the class names if the link looks like a link
                                $(link).replaceWith(function () {
                                    var looksLikeAlink = TextLooksLikeALink(linkHref, $(this).text());
                                    if ($(this).hasClass(suspiciousLinkClass) && (looksLikeAlink || linkHref.indexOf('mailto:') > -1 || linkHref.indexOf('tel:') > -1)) {
                                        //if ($(this).hasClass(suspiciousLinkClass)) {
                                        //log('suspicious link html: ' + $(link).html());
                                        return '<span class="' + $(this).attr('class') + ' phishweb-suspicious-text phishweb-linkreplacement" data-phishweb-replacedhref="' + linkHref + '" style="' + $(this).attr('style') + '">' + $(this).html() + '</span>';
                                    }
                                        //else if (looksLikeAlink) {
                                        //    log('regular link html: ' + $(link).html());
                                        //    return '<span class="' + $(this).attr('class') + ' phishweb-linkreplacement" data-phishweb-replacedhref="' + linkHref + '" style="' + $(this).attr('style') + '">' + $(this).html() + '</span>';
                                        //}
                                    else {
                                        //log('regular link html: ' + $(link).html());
                                        return '<span class="' + $(this).attr('class') + ' phishweb-linkreplacement" data-phishweb-replacedhref="' + linkHref + '" style="' + $(this).attr('style') + '">' + $(this).html() + '</span>';
                                    }
                                });
                            }

                            iterations += 1;
                            linksInBlock = getLinksFromEmailBlock(emailBlock);
                        }
                    }

                    setRemindersAndColors(emailBlock, emailBodyElement, senderEmailBlock);


                    // add the ability to turn off checking for this email
                    if ($(emailBlock).find('span.phishweb-turnoff').length == 0 && $(emailBlock).find('span.phishweb-turnon').length == 0) {
                        $('<div class="phishweb-onoffcontainer"><span class="phishweb-turnoff">phishweb: temporarily turn on links for this email section.</span></div>').insertBefore($(emailBodyElement));
                        var offbutton = $(emailBlock).find('span.phishweb-turnoff');
                        $(offbutton).off('click.phishweb-turnoff');
                        $(offbutton).on('click.phishweb-turnoff', function () {
                            var emailBlocks = $(emailBlockSelector).has($(this));
                            if (emailBlocks != null && emailBlocks.length == 1) {
                                var emailBlock = emailBlocks[0],
                                    emailBodyElement = $(emailBlock).find(emailBodyElementSelector);

                                // replace links
                                var iterations = 0;
                                var linksInBlock = $(emailBlock).find('.phishweb-linkreplacement');
                                while (linksInBlock.length > 0 && iterations < 5) {
                                    for (var iLink = 0; iLink < linksInBlock.length; iLink++) {
                                        var link = linksInBlock[iLink];
                                        $(link).replaceWith(function () {
                                            return '<a href="' + $(this).attr("data-phishweb-replacedhref") + '" class="'
                                                + $(this).attr('class').replace('phishweb-linkreplacement', '').replace('phishweb-suspicious-text', '') + '" style="'
                                                + $(this).attr('style') + '">'
                                                + $(this).html() + '</a>';
                                        });
                                    }

                                    iterations += 1;
                                    linksInBlock = $(emailBlock).find('.phishweb-linkreplacement');
                                }

                                // reset reminders and colors
                                var senderEmailBlock,
                                    senderDomain = null,
                                    senderSubdomain = null;
                                var senderElement = $(emailBlock).find(senderElementSelector);
                                if (senderElement != null && senderElement.length > 0 && senderElement[0].attributes.hasOwnProperty('email')) {
                                    senderEmail = senderElement[0].attributes['email'].value;
                                    senderEmailBlock = senderElement[0].parentElement;
                                    log('sender email: ' + senderEmail);


                                    if (senderEmail.indexOf('@') > -1) {
                                        senderDomain = senderSubdomain = senderEmail.substring(senderEmail.indexOf('@') + 1);
                                        var domainPieces = senderDomain.split('.');
                                        if (domainPieces.length > 2) {
                                            senderDomain = domainPieces[domainPieces.length - 2] + '.' + domainPieces[domainPieces.length - 1];
                                        }
                                    }
                                }
                                setRemindersAndColors(emailBlock, emailBodyElement, senderEmailBlock);

                                // let phishweb know to not reprocess this block
                                $(emailBlock).addClass('phishweb-skipprocessing');

                                // add the ability to turn blocking back on
                                $(this).replaceWith(function () {
                                    return '<div class="phishweb-links-on-warning">Links to ' + senderDomain + ' are bordered in green dashes.</div>'
                                        + '<div class="phishweb-links-on-warning"><strong>Links that dont go to ' + senderDomain + '</strong> are bordered in red.</div>'
                                        + '<span class="phishweb-turnon">phishweb: turn link blocking back on for this email section!</span>';
                                });
                                $(emailBlock).find('span.phishweb-turnoff').remove();
                                var onbutton = $(emailBlock).find('span.phishweb-turnon');
                                $(onbutton).off('click.phishweb-turnon');
                                $(onbutton).on('click.phishweb-turnon', function () {
                                    var emailBlocks = $(emailBlockSelector).has($(this));
                                    if (emailBlocks != null && emailBlocks.length == 1) {
                                        var emailBlock = emailBlocks[0];
                                        $(emailBlock).find('.phishweb-turnon').remove();
                                        $(emailBlock).find('.phishweb-links-on-warning').remove();
                                        $(emailBlock).removeClass('phishweb-skipprocessing');
                                        processOpenEmailSections();
                                    }
                                });
                            }
                        });
                    }
                    log('finished processing email block');
                //}

            }
        }
    }
    // END MAIN PROCESSING FUNCTION

    log('attaching phishweb');
    processOpenEmailSections();


    // listen to the open email section click
    $(emailHeaderSelector).on('click.phishweb-emailHeader', function () {
        setTimeout(processOpenEmailSections, 250);
    });


    // listen to the expand/collapse hidden content click
    function expandOrCollapseHiddenContentClickHandler() {
        setTimeout(processOpenEmailSections, 250);
    };
    $(trimmedContentSelector).on('click.phishweb-trimmedContent', expandOrCollapseHiddenContentClickHandler);


    // listen to the open middle collapsed emails click
    // this part is convoluted
    $(hiddenEmailHeaderSelector).click(function () {
        // timeout because the middle email sections generate slowly
        setTimeout(function () {

            // remove the old click handlers and add new ones
            $(emailHeaderSelector).off('click.phishweb-emailHeader');
            $(emailHeaderSelector).on('click.phishweb-emailHeader', function () {
                // another timer because the sections haven't been rendered yet
                setTimeout(function () {
                    processOpenEmailSections();

                    // also need to listen to trimmed content expander
                    $(trimmedContentSelector).off('click.phishweb-trimmedContent');
                    $(trimmedContentSelector).on('click.phishweb-trimmedContent', expandOrCollapseHiddenContentClickHandler);

                }, 250);
            });
        }, 250);
    });


});