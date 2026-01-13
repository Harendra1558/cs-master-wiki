import React from 'react';
import Footer from '@theme-original/BlogPostItem/Footer';
import Comments from '@site/src/components/Comments';

export default function FooterWrapper(props) {
    return (
        <>
            <Footer {...props} />
            <Comments />
        </>
    );
}
