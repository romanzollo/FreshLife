async function testGPTunnel() {
    const apiKey = 'shds-VsIKyOTAiegOqiGno802bweJOTo'; // Замени на свой ключ
    const url = 'https://gptunnel.ru/v1/models ';

    const response = await fetch(url, {
        method: 'GET',
        headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
        },
    });

    const data = await response.json();
    console.log(data);
}

testGPTunnel().catch(console.error);
