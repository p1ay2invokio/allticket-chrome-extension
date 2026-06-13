const getReferer = async (fallbackPerformId: string): Promise<string> => {
  if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.query) {
    try {
      const tabs = await chrome.tabs.query({ url: "*://*.allticket.com/*" });
      if (tabs && tabs.length > 0) {
        const matched = tabs.find(t => t.url && t.url.includes(fallbackPerformId));
        if (matched && matched.url) {
          return matched.url;
        }
        if (tabs[0].url) {
          return tabs[0].url;
        }
      }
    } catch (err) {
      console.warn('Failed to query tabs for referer:', err);
    }
  }
  return `https://www.allticket.com/event/${fallbackPerformId}`;
};

export const getRound = async (authorization: string, performId: string, quizResultKey?: string) => {
  const refererUrl = await getReferer(performId);
  const url = 'https://www.allticket.com/api-booking/get-round';
  const headers: Record<string, string> = {
    'accept': 'application/json, text/plain, */*',
    'accept-language': 'en',
    'authorization': authorization,
    'cache-control': 'no-cache',
    'content-type': 'application/json',
    'origin': 'https://www.allticket.com',
    'pragma': 'no-cache',
    'priority': 'u=1, i',
    'referer': refererUrl,
    'sec-ch-ua': '"Chromium";v="148", "Google Chrome";v="148", "Not/A)Brand";v="99"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"macOS"',
    'sec-fetch-dest': 'empty',
    'sec-fetch-mode': 'cors',
    'sec-fetch-site': 'same-origin',
    'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36',
  };

  if (quizResultKey) {
    headers['atk-q-result'] = quizResultKey;
  }

  const body = JSON.stringify({
    'performId': performId,
    ...(quizResultKey ? { 'quizResultKey': quizResultKey } : {})
  });

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: headers,
      body: body
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching rounds:', error);
    throw error;
  }
};

export const getSeatAvailable = async (authorization: string, performId: string, roundId: string, quizResultKey?: string) => {
  const refererUrl = await getReferer(performId);
  const url = 'https://www.allticket.com/api-booking/seat-available';
  const headers: Record<string, string> = {
    'accept': 'application/json, text/plain, */*',
    'accept-language': 'en',
    'authorization': authorization,
    'cache-control': 'no-cache',
    'content-type': 'application/json',
    'origin': 'https://www.allticket.com',
    'pragma': 'no-cache',
    'priority': 'u=1, i',
    'referer': refererUrl,
    'sec-ch-ua': '"Chromium";v="148", "Google Chrome";v="148", "Not/A)Brand";v="99"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"macOS"',
    'sec-fetch-dest': 'empty',
    'sec-fetch-mode': 'cors',
    'sec-fetch-site': 'same-origin',
    'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36',
  };

  if (quizResultKey) {
    headers['atk-q-result'] = quizResultKey;
  }

  const body = JSON.stringify({
    'performId': performId,
    'roundId': roundId,
    ...(quizResultKey ? { 'quizResultKey': quizResultKey } : {})
  });

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: headers,
      body: body
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching seat available:', error);
    throw error;
  }
};

export const getSeat = async (authorization: string, performId: string, roundId: string, zoneId: string, quizResultKey?: string) => {
  const refererUrl = await getReferer(performId);
  const url = 'https://www.allticket.com/api-booking/get-seat';
  const headers: Record<string, string> = {
    'accept': 'application/json, text/plain, */*',
    'accept-language': 'en',
    'authorization': authorization,
    'cache-control': 'no-cache',
    'content-type': 'application/json',
    'origin': 'https://www.allticket.com',
    'pragma': 'no-cache',
    'priority': 'u=1, i',
    'referer': refererUrl,
    'sec-ch-ua': '"Chromium";v="148", "Google Chrome";v="148", "Not/A)Brand";v="99"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"macOS"',
    'sec-fetch-dest': 'empty',
    'sec-fetch-mode': 'cors',
    'sec-fetch-site': 'same-origin',
    'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36',
  };

  if (quizResultKey) {
    headers['atk-q-result'] = quizResultKey;
  }

  const body = JSON.stringify({
    'performId': performId,
    'roundId': roundId,
    'zoneId': zoneId,
    ...(quizResultKey ? { 'quizResultKey': quizResultKey } : {})
  });

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: headers,
      body: body
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching seat detail:', error);
    throw error;
  }
};

export const reserveSeat = async (authorization: string, atkZData: string, payload: any, quizResultKey?: string) => {
  const refererUrl = await getReferer(payload.performId);
  const url = 'https://www.allticket.com/api-booking/handler-reserve';
  const headers: any = {
    'accept': 'application/json, text/plain, */*',
    'accept-language': 'en',
    'authorization': authorization,
    'cache-control': 'no-cache',
    'content-type': 'application/json',
    'origin': 'https://www.allticket.com',
    'pragma': 'no-cache',
    'priority': 'u=1, i',
    'referer': refererUrl,
    'sec-ch-ua': '"Chromium";v="148", "Google Chrome";v="148", "Not/A)Brand";v="99"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"macOS"',
    'sec-fetch-dest': 'empty',
    'sec-fetch-mode': 'cors',
    'sec-fetch-site': 'same-origin',
    'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36',
  };

  if (atkZData) {
    headers['atk-z-data'] = atkZData;
  }

  if (quizResultKey) {
    headers['atk-q-result'] = quizResultKey;
  }

  const finalPayload = {
    ...payload,
    ...(quizResultKey ? { quizResultKey } : {})
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(finalPayload)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error reserving seat:', error);
    throw error;
  }
};

export const checkBooking = async (authorization: string, uuid: string, quizResultKey?: string) => {
  const url = 'https://www.allticket.com/api-verify/check-booking';
  const headers: Record<string, string> = {
    'accept': 'application/json, text/plain, */*',
    'accept-language': 'en',
    'authorization': authorization,
    'cache-control': 'no-cache',
    'content-type': 'application/json',
    'origin': 'https://www.allticket.com',
    'pragma': 'no-cache',
    'priority': 'u=1, i',
    'referer': 'https://www.allticket.com/',
    'sec-ch-ua': '"Chromium";v="148", "Google Chrome";v="148", "Not/A)Brand";v="99"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"macOS"',
    'sec-fetch-dest': 'empty',
    'sec-fetch-mode': 'cors',
    'sec-fetch-site': 'same-origin',
    'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36',
  };

  if (quizResultKey) {
    headers['atk-q-result'] = quizResultKey;
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({
        uuid,
        ...(quizResultKey ? { quizResultKey } : {})
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error checking booking:', error);
    throw error;
  }
};

export const checkEvent = async (authorization: string, performId: string) => {
  const refererUrl = await getReferer(performId);
  const url = 'https://www.allticket.com/api-content/check-event';
  const headers = {
    'accept': 'application/json, text/plain, */*',
    'accept-language': 'en',
    'authorization': authorization,
    'cache-control': 'no-cache',
    'content-type': 'application/json',
    'origin': 'https://www.allticket.com',
    'pragma': 'no-cache',
    'priority': 'u=1, i',
    'referer': refererUrl,
    'sec-ch-ua': '"Chromium";v="148", "Google Chrome";v="148", "Not/A)Brand";v="99"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"macOS"',
    'sec-fetch-dest': 'empty',
    'sec-fetch-mode': 'cors',
    'sec-fetch-site': 'same-origin',
    'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36',
  };

  const body = JSON.stringify({
    'performId': performId,
    'cached': true
  });

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: headers,
      body: body
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const serverTimeHeader = response.headers.get('date');
    const data = await response.json();
    if (data && typeof data === 'object') {
      data._serverTime = serverTimeHeader ? new Date(serverTimeHeader).getTime() : Date.now();
    }
    return data;
  } catch (error) {
    console.error('Error checking event:', error);
    throw error;
  }
};

export const getQuestion = async (authorization: string, performId: string, qtoken: string) => {
  const refererUrl = await getReferer(performId);
  const url = 'https://www.allticket.com/api-booking/quiz/get-question';
  const headers = {
    'accept': 'application/json, text/plain, */*',
    'accept-language': 'en',
    'atk-q-data': qtoken,
    'authorization': authorization,
    'cache-control': 'no-cache',
    'content-type': 'application/json',
    'origin': 'https://www.allticket.com',
    'pragma': 'no-cache',
    'priority': 'u=1, i',
    'referer': refererUrl,
    'sec-ch-ua': '"Google Chrome";v="149", "Chromium";v="149", "Not)A;Brand";v="24"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"macOS"',
    'sec-fetch-dest': 'empty',
    'sec-fetch-mode': 'cors',
    'sec-fetch-site': 'same-origin',
    'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36',
  };
  const body = JSON.stringify({ performId });

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: headers,
      body: body
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const responseAtkQData = response.headers.get('atk-q-data') || '';
    const data = await response.json();
    return {
      data,
      responseAtkQData
    };
  } catch (error) {
    console.error('Error getting question:', error);
    throw error;
  }
};

export const checkAnswer = async (
  authorization: string,
  performId: string,
  responseAtkQData: string,
  questionId: string,
  answerId: number,
  answerText: string
) => {
  const refererUrl = await getReferer(performId);
  const url = 'https://www.allticket.com/api-booking/quiz/check-answer';
  const headers = {
    'accept': 'application/json, text/plain, */*',
    'accept-language': 'en',
    'atk-q-data': responseAtkQData,
    'authorization': authorization,
    'cache-control': 'no-cache',
    'content-type': 'application/json',
    'origin': 'https://www.allticket.com',
    'pragma': 'no-cache',
    'priority': 'u=1, i',
    'referer': refererUrl,
    'sec-ch-ua': '"Google Chrome";v="149", "Chromium";v="149", "Not)A;Brand";v="24"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"macOS"',
    'sec-fetch-dest': 'empty',
    'sec-fetch-mode': 'cors',
    'sec-fetch-site': 'same-origin',
    'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36',
  };
  const body = JSON.stringify({
    performId,
    questionId,
    answerId,
    answerText
  });

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: headers,
      body: body
    });

    const nextAtkQData = response.headers.get('atk-q-data') || responseAtkQData;
    const data = await response.json();
    return {
      data,
      responseAtkQData: nextAtkQData
    };
  } catch (error) {
    console.error('Error checking answer:', error);
    throw error;
  }
};
