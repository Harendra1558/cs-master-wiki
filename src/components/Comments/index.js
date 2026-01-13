import React from 'react';
import Giscus from '@giscus/react';
import { useColorMode } from '@docusaurus/theme-common';

export default function Comments() {
    const { colorMode } = useColorMode();

    return (
        <div style={{ marginTop: '50px' }}>
            <Giscus
                id="comments"
                repo="Harendra1558/cs-master-wiki"
                repoId="R_kgDOQ1maBA"
                category="General"
                categoryId="DIC_kwDOQ1maBM4C06xR"
                mapping="pathname"
                strict="0"
                reactionsEnabled="1"
                emitMetadata="0"
                inputPosition="top"
                theme={colorMode}
                lang="en"
                loading="lazy"
            />
        </div>
    );
}
