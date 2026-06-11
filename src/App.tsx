import { useEffect, useState } from 'react'
import './App.css'
import { getRound, getSeatAvailable, getSeat, reserveSeat, checkBooking, checkEvent } from './methods/allticket.methods'

type Entry = { key: string; value: string; parsed: unknown; type: 'local' | 'session' }

function decodeJwt(token: string): any {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

function parseTicketLabelsFromHtml(htmlStr: string): Record<string, string> {
  const mapping: Record<string, string> = {};
  if (!htmlStr) return mapping;
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlStr, 'text/html');
    const imgs = doc.querySelectorAll('img[id^="RF_"]');
    imgs.forEach((img) => {
      const id = img.id.replace('RF_', '');
      const tr = img.closest('tr');
      if (tr) {
        const textCell = tr.querySelector('td');
        if (textCell) {
          const text = textCell.textContent || '';
          const cleanedText = text
            .replace(/\s+/g, ' ')
            .replace(/- ราคาบัตรยังไม่รวมค่าธรรมเนียม.*/g, '')
            .replace(/- จำกัดการซื้อบัตร.*/g, '')
            .trim();
          if (cleanedText && id) {
            mapping[id] = cleanedText;
          }
        }
      }
    });
  } catch (err) {
    console.error('Error parsing ticket labels:', err);
  }
  return mapping;
}

function App() {
  const [entries, setEntries] = useState<Entry[]>([])
  const [token, setToken] = useState<string>('')
  const [performId, setPerformId] = useState<string>('')
  const [atkZData, setAtkZData] = useState<string>('')
  const [seatResult, setSeatResult] = useState<any>(null)
  const [seatDetailResult, setSeatDetailResult] = useState<any>(null)
  const [reserveResult, setReserveResult] = useState<any>(null)
  const [pollingStatus, setPollingStatus] = useState<string>('')
  const [selectedRound, setSelectedRound] = useState<string>('')
  const [selectedZone, setSelectedZone] = useState<string>('')
  const [selectedSeats, setSelectedSeats] = useState<any[]>([])
  const [manualSeats, setManualSeats] = useState<string>('')
  const [seatAmount, setSeatAmount] = useState<string>('1')
  const [loading, setLoading] = useState<boolean>(false)
  const [loadingSeat, setLoadingSeat] = useState<boolean>(false)
  const [loadingSeatDetail, setLoadingSeatDetail] = useState<boolean>(false)
  const [loadingReserve, setLoadingReserve] = useState<boolean>(false)

  const [rounds, setRounds] = useState<any[]>([])
  const [quizResultKey, setQuizResultKey] = useState<string>('')
  const [quizQuestion, setQuizQuestion] = useState<any>(null)
  const [responseAtkQData, setResponseAtkQData] = useState<string>('')
  const [selectedAnswer, setSelectedAnswer] = useState<any>(null)
  const [quizLoading, setQuizLoading] = useState<boolean>(false)
  const [autoSolve, setAutoSolve] = useState<boolean>(true)
  const [debugLogs, setDebugLogs] = useState<string[]>([])
  const [quizSentTime, setQuizSentTime] = useState<number>(0)
  const [consentId, setConsentId] = useState<string>(() => {
    return localStorage.getItem('atk_consent_id') || 'SF1'
  })
  const [eventConsents, setEventConsents] = useState<any[]>([])
  const [activeSidebarTab, setActiveSidebarTab] = useState<'logs' | 'storage'>('logs')
  const [showSettings, setShowSettings] = useState<boolean>(false)
  const [storageSearch, setStorageSearch] = useState<string>('')
  const [storageTypeFilter, setStorageTypeFilter] = useState<'all' | 'local' | 'session'>('all')
  const [bookingMode, setBookingMode] = useState<'auto' | 'manual'>('manual')
  const [botSeatAmount, setBotSeatAmount] = useState<number>(1)
  const [maxSeatLimit, setMaxSeatLimit] = useState<number>(4)
  const [showSeatModal, setShowSeatModal] = useState<boolean>(false)
  const [botRunning, setBotRunning] = useState<boolean>(false)
  const [performances, setPerformances] = useState<any[]>([])
  const [selectedPerformance, setSelectedPerformance] = useState<string>('')
  const [ticketLabels, setTicketLabels] = useState<Record<string, string>>({})

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    logDebug('Copied item to clipboard')
  }

  const updateConsentId = (id: string) => {
    setConsentId(id)
    localStorage.setItem('atk_consent_id', id)
  }

  const selectedRoundObject = rounds.find((r: any) => r.roundId === selectedRound)
  const targetPerformId = selectedPerformance || selectedRoundObject?.performId || performId

  const logDebug = (msg: string) => {
    console.log(msg)
    setDebugLogs(prev => [...prev.slice(-49), `${new Date().toLocaleTimeString()}: ${msg}`])
  }

  const updateQuizResultKey = (key: string) => {
    logDebug(`Saving quizResultKey: ${key}`)
    setQuizResultKey(key)
    sessionStorage.setItem('quizResultKey', key)
  }

  const fetchInTab = async (url: string, method: string, headers: any, body?: string) => {
    logDebug(`fetchInTab: url=${url}, method=${method}, body=${body || ''}`)
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (!tab) {
      logDebug('fetchInTab error: No active tab found')
      throw new Error('No active tab found')
    }

    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id! },
      func: async (url, method, headers, body) => {
        try {
          const response = await fetch(url, {
            method,
            headers,
            body: body || undefined
          });
          const responseAtkQData = response.headers.get('atk-q-data') || '';
          const data = await response.json();
          return {
            success: true,
            data,
            responseAtkQData
          };
        } catch (err: any) {
          return {
            success: false,
            error: err.message
          };
        }
      },
      args: [url, method, headers, body || '']
    });

    const result = results[0]?.result as any
    if (!result) {
      logDebug('fetchInTab error: result is empty')
      throw new Error('Failed to execute fetch in tab')
    }
    if (!result.success) {
      logDebug(`fetchInTab error: failed with error=${result.error}`)
      throw new Error(result.error || 'Fetch in tab failed')
    }
    logDebug(`fetchInTab success: responseAtkQData=${result.responseAtkQData}, data=${JSON.stringify(result.data)}`)
    return {
      data: result.data,
      responseAtkQData: result.responseAtkQData
    };
  }

  const getQuestionInTab = async (authorization: string, performId: string, qtoken: string) => {
    const url = 'https://www.allticket.com/api-booking/quiz/get-question';
    const headers = {
      'accept': 'application/json, text/plain, */*',
      'accept-language': 'en',
      'atk-q-data': qtoken,
      'authorization': authorization,
      'content-type': 'application/json',
    };
    const body = JSON.stringify({ performId });
    return fetchInTab(url, 'POST', headers, body);
  }

  const checkAnswerInTab = async (
    authorization: string,
    performId: string,
    responseAtkQData: string,
    questionId: string,
    answerId: number,
    answerText: string
  ) => {
    const url = 'https://www.allticket.com/api-booking/quiz/check-answer';
    const headers = {
      'accept': 'application/json, text/plain, */*',
      'accept-language': 'en',
      'atk-q-data': responseAtkQData,
      'authorization': authorization,
      'content-type': 'application/json',
    };
    const body = JSON.stringify({
      performId,
      questionId,
      answerId,
      answerText
    });
    return fetchInTab(url, 'POST', headers, body);
  }

  useEffect(() => {
    // Reset quiz when performId changes
    updateQuizResultKey('')
    setQuizQuestion(null)
    setSelectedAnswer(null)
  }, [performId])

  useEffect(() => {
    extract()
    const savedKey = sessionStorage.getItem('quizResultKey')
    if (savedKey) {
      setQuizResultKey(savedKey)
    }
  }, [])

  useEffect(() => {
    if (targetPerformId && eventConsents.length > 0) {
      const match = eventConsents.find((c: any) => c.performId === targetPerformId)
      if (match && match.consentId) {
        logDebug(`Auto-detected matching consentId for performId ${targetPerformId}: ${match.consentId}`)
        updateConsentId(match.consentId)
      }
    }
  }, [targetPerformId, eventConsents])

  const extract = async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })

    if (!tab.url?.includes('allticket.com')) {
      alert('Please navigate to an AllTicket page to extract data.')
      return
    }

    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id! },
      func: () => {
        const local = Object.entries(localStorage).map(([key, value]) => ({ key, value, type: 'local' }));
        const session = Object.entries(sessionStorage).map(([key, value]) => ({ key, value, type: 'session' }));
        return [...local, ...session];
      }
    });

    const raw = (results[0]?.result || []) as { key: string; value: string; type: string }[]

    const parsed: Entry[] = raw.map(({ key, value, type }) => {
      try {
        return { key, value, parsed: JSON.parse(value), type: type as 'local' | 'session' }
      } catch {
        return { key, value, parsed: null, type: type as 'local' | 'session' }
      }
    })

    const filteredData = parsed.filter(item => item.key !== 'errorCodeList')
    setEntries(filteredData)

    // 1. Try to auto-fill token if found in localStorage
    const tokenEntry = parsed.find(item => 
      item.key.toLowerCase().includes('token') || 
      item.key.toLowerCase().includes('auth')
    )
    if (tokenEntry) {
      setToken(tokenEntry.value.replace(/"/g, ''))
    }

    // 2. Try to auto-fill atk-z-data if found
    const zDataEntry = parsed.find(item => item.key === 'atk-z-data')
    if (zDataEntry) {
      setAtkZData(zDataEntry.value.replace(/"/g, ''))
    }

    // 3. Try to auto-fill performId from atk-selectEvent in sessionStorage
    const eventEntry = parsed.find(item => item.key === 'atk-selectEvent')
    if (eventEntry && eventEntry.parsed && Array.isArray(eventEntry.parsed)) {
      const eventData = eventEntry.parsed[0]
      if (eventData && eventData.event_id) {
        setPerformId(eventData.event_id)
      }
    }

    // 4. Try to auto-fill consentId from ev_consent_* in parsed storage
    const consentEntry = parsed.find(item => item.key.startsWith('ev_consent_') && item.parsed)
    if (consentEntry && consentEntry.parsed && typeof consentEntry.parsed === 'object') {
      const consentKeys = Object.keys(consentEntry.parsed)
      if (consentKeys.length > 0) {
        updateConsentId(consentKeys[0])
      }
    }

    // 5. Try to fetch event consents from the event_info JSON on AllTicket
    const eventMatch = tab.url.match(/\/event\/([^/?#]+)/)
    const slug = eventMatch ? eventMatch[1] : null
    if (slug) {
      try {
        logDebug(`Auto-detecting consents from event_info slug=${slug}...`)
        const eventInfoRes = await fetchInTab(`https://www.allticket.com/master/event_info/${slug}.json?time=${Date.now()}`, 'GET', {
          'accept': 'application/json, text/plain, */*'
        })
        if (eventInfoRes?.data?.data?.event_ref?.event_consent) {
          const consentsList = eventInfoRes.data.data.event_ref.event_consent
          logDebug(`Auto-detected event consents list: ${JSON.stringify(consentsList)}`)
          setEventConsents(consentsList)
        }
        if (eventInfoRes?.data?.data?.infoHtml) {
          const labels = parseTicketLabelsFromHtml(eventInfoRes.data.data.infoHtml)
          logDebug(`Parsed ticket labels: ${JSON.stringify(labels)}`)
          setTicketLabels(labels)
        }
      } catch (err: any) {
        logDebug(`Failed to auto-detect event consents: ${err.message}`)
      }
    }
    // Auto-trigger getRound
    const extractedToken = tokenEntry ? tokenEntry.value.replace(/"/g, '') : '';
    let extractedPerformId = '';
    if (eventEntry && eventEntry.parsed && Array.isArray(eventEntry.parsed)) {
      const eventData = eventEntry.parsed[0]
      if (eventData && eventData.event_id) {
        extractedPerformId = eventData.event_id;
      }
    }
    
    if (extractedToken && extractedPerformId) {
      logDebug(`Auto-triggering Get Round API for token and performId ${extractedPerformId}...`);
      setTimeout(() => {
        handleGetRound(false, extractedToken, extractedPerformId)
      }, 300)
    }
  }

  const handleFetchRounds = async (perf: any, activeToken: string, bypassQuiz: boolean = false) => {
    const targetPerfId = perf.performId
    let currentQuizResultKey = quizResultKey

    // If the performance has a quiz and we don't have quizResultKey yet
    if (perf.hasQuiz && !currentQuizResultKey && !bypassQuiz) {
      setPollingStatus(`Performance ${targetPerfId} requires quiz! Fetching question...`)
      logDebug(`Performance ${targetPerfId} requires quiz! Fetching question...`)
      const requestStartTime = Date.now()
      setQuizSentTime(requestStartTime)
      const quizInfo = await getQuestionInTab(activeToken, targetPerfId, perf.qtoken)
      logDebug(`getQuestionInTab response: ${JSON.stringify(quizInfo)}`)
      
      if (quizInfo?.data?.success && quizInfo?.data?.data?.question) {
        const quizData = quizInfo.data.data
        const questionObj = quizData.question || {}
        const answers = questionObj.answers || quizData.answers || []
        const qid = questionObj.qid || quizData.qid || ''
        let currentAtkQData = quizInfo.responseAtkQData
        let solvedKey = ''

        if (autoSolve) {
          let waitSeconds = 5
          const jwt = decodeJwt(currentAtkQData)
          if (jwt && jwt.nbf && jwt.iat) {
            const elapsedSinceSent = (Date.now() - requestStartTime) / 1000
            waitSeconds = (jwt.nbf - jwt.iat) - elapsedSinceSent
            logDebug(`JWT anti-bot timer decoded: iat=${jwt.iat}, nbf=${jwt.nbf}, elapsed since request sent=${elapsedSinceSent.toFixed(3)}s. Remaining wait=${waitSeconds.toFixed(3)}s`)
          } else {
            const waitSecondsFallback = quizData.timer || questionObj.timer || 5
            const elapsedSinceSent = (Date.now() - requestStartTime) / 1000
            waitSeconds = waitSecondsFallback - elapsedSinceSent
            logDebug(`Could not decode JWT. Using fallback timer: ${waitSecondsFallback}s. Remaining wait=${waitSeconds.toFixed(3)}s`)
          }

          const waitMs = Math.max(0, waitSeconds + 0.2) * 1000
          if (waitMs > 0) {
            logDebug(`Waiting for ${(waitMs / 1000).toFixed(3)} seconds (anti-bot nbf timer)...`)
            setPollingStatus(`Waiting ${(waitMs / 1000).toFixed(1)}s for quiz activation...`)
            await new Promise(resolve => setTimeout(resolve, waitMs))
          }

          setPollingStatus(`Auto-solving quiz... Trying ${answers.length} options.`)
          
          for (let i = 0; i < answers.length; i++) {
            const ans = answers[i]
            setPollingStatus(`Trying choice ${i + 1}/${answers.length}: "${ans.text}"...`)
            
            try {
              const checkRes = await checkAnswerInTab(
                activeToken,
                targetPerfId,
                currentAtkQData,
                qid,
                ans.id,
                ans.text
              )
              
              if (checkRes.responseAtkQData) {
                currentAtkQData = checkRes.responseAtkQData
              }

              if (checkRes.data?.success && checkRes.data?.data?.quizResultKey) {
                solvedKey = checkRes.data.data.quizResultKey
                updateQuizResultKey(solvedKey)
                currentQuizResultKey = solvedKey
                setPollingStatus(`Quiz solved with choice: "${ans.text}"!`)
                break
              }
            } catch (err: any) {
              logDebug(`Choice "${ans.text}" failed: ${err.message}`)
            }
          }
        }

        if (solvedKey) {
          // Successfully solved! Now fetch the rounds
          setPollingStatus('Quiz verified! Fetching rounds...')
          const data = await getRound(activeToken, targetPerfId, solvedKey)
          const listRound = data?.data?.event_info?.list_round || []
          const mapped = listRound.map((r: any) => ({ ...r, performId: targetPerfId }))
          setRounds(mapped)
          if (mapped.length > 0) {
            setSelectedRound(mapped[0].roundId)
          }
          setPollingStatus('Quiz solved & rounds fetched successfully.')
          return true
        } else {
          // Failed to auto-solve or autoSolve is disabled, fallback to manual quiz box
          setQuizQuestion(quizData)
          setResponseAtkQData(currentAtkQData)
          setSelectedAnswer(null)
          setPollingStatus(autoSolve ? 'Auto-solve failed. Please answer manually.' : 'Please answer the quiz below.')
          return false
        }
      } else {
        throw new Error(quizInfo?.data?.message || 'Failed to fetch quiz question')
      }
    }

    setPollingStatus(`Fetching rounds for Performance ${targetPerfId}...`)
    const data = await getRound(activeToken, targetPerfId, currentQuizResultKey)
    
    const listRound = data?.data?.event_info?.list_round || []
    const mapped = listRound.map((r: any) => ({ ...r, performId: targetPerfId }))
    setRounds(mapped)
    if (mapped.length > 0) {
      setSelectedRound(mapped[0].roundId)
    }
    setPollingStatus('Rounds fetched successfully.')
    return true
  }

  const handleSelectPerformance = async (perfId: string) => {
    setSelectedPerformance(perfId)
    setSelectedRound('')
    setRounds([])
    setSelectedZone('')
    setSeatResult(null)
    setSeatDetailResult(null)
    setSelectedSeats([])
    setPollingStatus(`Selected Performance: ${perfId}. Loading rounds...`)
    
    const perf = performances.find((p: any) => p.performId === perfId)
    if (perf) {
      setLoading(true)
      try {
        await handleFetchRounds(perf, token, false)
      } catch (err: any) {
        alert('Error fetching rounds: ' + err.message)
        setPollingStatus('Error: ' + err.message)
      } finally {
        setLoading(false)
      }
    }
  }

  const handleGetRound = async (bypassQuizCheck: boolean = false, overrideToken?: string, overridePerformId?: string) => {
    const activeToken = overrideToken || token
    const activePerformId = overridePerformId || performId

    logDebug(`handleGetRound called, bypassQuizCheck=${bypassQuizCheck}`)
    if (!activeToken) {
      alert('Please enter authorization token')
      return
    }
    if (!activePerformId) {
      alert('Could not find performId (event_id)')
      return
    }
    setLoading(true)
    setSeatResult(null)
    setSeatDetailResult(null)
    setReserveResult(null)
    setPollingStatus('')
    setSelectedRound('')
    setSelectedZone('')
    setSelectedSeats([])
    try {
      setPollingStatus('Checking event config...')
      logDebug('handleGetRound: calling checkEvent...')
      const eventStatus = await checkEvent(activeToken, activePerformId)
      logDebug(`handleGetRound: checkEvent response=${JSON.stringify(eventStatus)}`)
      const eventInfo = eventStatus?.data?.event_info || {}
      const maxReserveLimit = eventInfo.maxSelectSeatPerUser || eventInfo.maxSelectSeat || eventInfo.maxReserve || 4
      setMaxSeatLimit(maxReserveLimit)
      logDebug(`Max seat limit set to: ${maxReserveLimit}`)
      const eventRefs = eventStatus?.data?.event_info?.eventRef || eventStatus?.data?.eventRef || []
      if (eventRefs.length > 0) {
        logDebug(`Raw eventRefs: ${JSON.stringify(eventRefs)}`)
      }

      let activeLabels = ticketLabels
      if (Object.keys(activeLabels).length === 0) {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
        const eventMatch = tab?.url?.match(/\/event\/([^/?#]+)/)
        const slug = eventMatch ? eventMatch[1] : null
        if (slug) {
          try {
            const eventInfoRes = await fetchInTab(`https://www.allticket.com/master/event_info/${slug}.json?time=${Date.now()}`, 'GET', {
              'accept': 'application/json, text/plain, */*'
            })
            if (eventInfoRes?.data?.data?.infoHtml) {
              activeLabels = parseTicketLabelsFromHtml(eventInfoRes.data.data.infoHtml)
              setTicketLabels(activeLabels)
            }
          } catch (err: any) {
            logDebug(`Failed to on-the-fly parse ticket labels: ${err.message}`)
          }
        }
      }

      let perfList = []
      if (eventRefs.length > 0) {
        perfList = eventRefs.map((ref: any) => {
          const mappedName = activeLabels[ref.performId] || `Show Date: ${ref.performId}`
          return {
            performId: ref.performId,
            performNameTh: mappedName,
            performNameEn: mappedName,
            hasQuiz: ref.hasQuiz,
            qtoken: ref.qtoken
          };
        })
      } else {
        perfList = [{
          performId: activePerformId,
          performNameTh: `Default Performance (${activePerformId})`,
          performNameEn: `Default Performance (${activePerformId})`,
          hasQuiz: false,
          qtoken: ''
        }]
      }
      setPerformances(perfList)
      logDebug(`Loaded ${perfList.length} performance(s)`)

      const firstPerf = perfList[0]
      setSelectedPerformance(firstPerf.performId)
      await handleFetchRounds(firstPerf, activeToken, bypassQuizCheck)
    } catch (error: any) {
      alert('Error: ' + error.message)
      setPollingStatus('Error: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleAnswerQuiz = async () => {
    if (!selectedAnswer || !quizQuestion || !responseAtkQData) {
      alert('Please select an answer')
      return
    }

    setQuizLoading(true)
    setPollingStatus('Submitting answer...')
    try {
      const selectedRoundObject = rounds.find((r: any) => r.roundId === selectedRound)
      const targetPerformId = selectedPerformance || selectedRoundObject?.performId || performId

      const targetQid = quizQuestion.question?.qid || quizQuestion.qid

      // Anti-bot timer check for manual submission
      if (quizSentTime) {
        let waitSeconds = 0
        const jwt = decodeJwt(responseAtkQData)
        if (jwt && jwt.nbf && jwt.iat) {
          const elapsedSinceSent = (Date.now() - quizSentTime) / 1000
          waitSeconds = (jwt.nbf - jwt.iat) - elapsedSinceSent
        }
        const waitMs = Math.max(0, waitSeconds + 0.2) * 1000
        if (waitMs > 0) {
          logDebug(`Manual answer: waiting for ${(waitMs / 1000).toFixed(3)} seconds before submitting (nbf timer)...`)
          setPollingStatus(`Waiting ${(waitMs / 1000).toFixed(1)}s for quiz activation...`)
          await new Promise(resolve => setTimeout(resolve, waitMs))
        }
      }

      const result = await checkAnswerInTab(
        token,
        targetPerformId,
        responseAtkQData,
        targetQid,
        selectedAnswer.id,
        selectedAnswer.text
      )

      if (result.data?.success && result.data?.data?.quizResultKey) {
        const key = result.data.data.quizResultKey
        updateQuizResultKey(key)
        setQuizQuestion(null)
        setPollingStatus('Quiz verified! Fetching data...')
        
        if (botRunning) {
          setTimeout(() => {
            resumeBotBooking(key)
          }, 400)
          return
        }
        
        if (!selectedRound || selectedRoundObject?.isEventRef) {
          // Fetch actual rounds using the key
          const roundsData = await getRound(token, targetPerformId, key)
          const listRound = roundsData?.data?.event_info?.list_round || []
          const mapped = listRound.map((r: any) => ({ ...r, performId: targetPerformId }))
          setRounds(mapped)
          if (mapped.length > 0) {
            setSelectedRound(mapped[0].roundId)
          }
          setPollingStatus('Concert rounds loaded. Please select round and fetch seats.')
        } else {
          // If an actual show date round was already selected, fetch seat availability
          const data = await getSeatAvailable(token, targetPerformId, selectedRound, key)
          setSeatResult(data)
          if (data?.data?.seat_available?.length > 0) {
            setSelectedZone(data.data.seat_available[0].id)
          }
          setPollingStatus('Quiz verified & seats fetched!')
        }
      } else {
        alert('Answer verification failed: ' + (result.data?.message || 'Incorrect answer'))
        setPollingStatus('Incorrect answer. Try again.')
        if (result.responseAtkQData) {
          setResponseAtkQData(result.responseAtkQData)
        }
      }
    } catch (error: any) {
      alert('Error verifying answer: ' + error.message)
      setPollingStatus('Error verifying answer: ' + error.message)
    } finally {
      setQuizLoading(false)
    }
  }

  const handleGetSeatAvailable = async () => {
    logDebug('handleGetSeatAvailable called')
    if (!token || !performId || !selectedRound) {
      alert('Missing required information (Token, Perform ID, or Selected Round)')
      return
    }

    const selectedRoundObject = rounds.find((r: any) => r.roundId === selectedRound)
    const targetPerformId = selectedPerformance || selectedRoundObject?.performId || performId
    let currentQuizResultKey = quizResultKey

    setLoadingSeat(true)
    setSelectedZone('')
    setSeatDetailResult(null)
    setReserveResult(null)
    setPollingStatus('')
    setSelectedSeats([])
    try {
      const selectedPerfObject = performances.find((p: any) => p.performId === targetPerformId)
      if (selectedPerfObject?.hasQuiz && !currentQuizResultKey) {
        logDebug(`Performance requires quiz! Fetching question for performId=${targetPerformId}...`)
        setPollingStatus('Performance requires quiz! Fetching question...')
        const requestStartTime = Date.now()
        setQuizSentTime(requestStartTime)
        const quizInfo = await getQuestionInTab(token, targetPerformId, selectedPerfObject.qtoken)
        logDebug(`getQuestionInTab result=${JSON.stringify(quizInfo)}`)
        
        if (quizInfo?.data?.success && quizInfo?.data?.data?.question) {
          const quizData = quizInfo.data.data
          const questionObj = quizData.question || {}
          const answers = questionObj.answers || quizData.answers || []
          const qid = questionObj.qid || quizData.qid || ''
          let currentAtkQData = quizInfo.responseAtkQData
          let solvedKey = ''

          if (autoSolve) {
            let waitSeconds = 5
            const jwt = decodeJwt(currentAtkQData)
            if (jwt && jwt.nbf && jwt.iat) {
              const elapsedSinceSent = (Date.now() - requestStartTime) / 1000
              waitSeconds = (jwt.nbf - jwt.iat) - elapsedSinceSent
              logDebug(`JWT anti-bot timer decoded: iat=${jwt.iat}, nbf=${jwt.nbf}, elapsed since request sent=${elapsedSinceSent.toFixed(3)}s. Remaining wait=${waitSeconds.toFixed(3)}s`)
            } else {
              const waitSecondsFallback = quizData.timer || questionObj.timer || 5
              const elapsedSinceSent = (Date.now() - requestStartTime) / 1000
              waitSeconds = waitSecondsFallback - elapsedSinceSent
              logDebug(`Could not decode JWT. Using fallback timer: ${waitSecondsFallback}s. Remaining wait=${waitSeconds.toFixed(3)}s`)
            }

            const waitMs = Math.max(0, waitSeconds + 0.2) * 1000
            if (waitMs > 0) {
              logDebug(`Waiting for ${(waitMs / 1000).toFixed(3)} seconds (anti-bot nbf timer)...`)
              setPollingStatus(`Waiting ${(waitMs / 1000).toFixed(1)}s for quiz activation...`)
              await new Promise(resolve => setTimeout(resolve, waitMs))
            }

            logDebug(`autoSolve loop start: answers.length=${answers.length}`)
            setPollingStatus(`Auto-solving round quiz... Trying ${answers.length} options.`)
            for (let i = 0; i < answers.length; i++) {
              const ans = answers[i]
              logDebug(`Auto-solving: trying choice ${i + 1}/${answers.length} - id=${ans.id}, text="${ans.text}"`)
              setPollingStatus(`Trying choice ${i + 1}/${answers.length}: "${ans.text}"...`)
              try {
                const checkRes = await checkAnswerInTab(
                  token,
                  targetPerformId,
                  currentAtkQData,
                  qid,
                  ans.id,
                  ans.text
                )
                
                logDebug(`checkAnswerInTab result for choice "${ans.text}": ${JSON.stringify(checkRes)}`)
                
                if (checkRes.responseAtkQData) {
                  currentAtkQData = checkRes.responseAtkQData
                }

                if (checkRes.data?.success && checkRes.data?.data?.quizResultKey) {
                  solvedKey = checkRes.data.data.quizResultKey
                  updateQuizResultKey(solvedKey)
                  currentQuizResultKey = solvedKey
                  logDebug(`Quiz successfully solved! solvedKey=${solvedKey}`)
                  setPollingStatus(`Quiz solved with choice: "${ans.text}"!`)
                  break
                }
              } catch (err: any) {
                logDebug(`Choice "${ans.text}" failed: ${err.message}`)
                console.warn(`Choice ${ans.text} failed:`, err.message)
              }
            }
          }

          if (solvedKey) {
            setPollingStatus('Quiz solved! Fetching seats...')
          } else {
            // Fallback to manual quiz box
            logDebug('Auto-solve failed or skipped. Displaying manual quiz box.')
            setQuizQuestion(quizData)
            setResponseAtkQData(currentAtkQData)
            setSelectedAnswer(null)
            setPollingStatus(autoSolve ? 'Auto-solve failed. Please answer manually.' : 'Please answer the quiz below.')
            setLoadingSeat(false)
            return
          }
        } else {
          logDebug('Failed to fetch quiz question (quizInfo.data.success is false or no question)')
          throw new Error(quizInfo?.data?.message || 'Failed to fetch quiz question')
        }
      }

      const data = await getSeatAvailable(token, targetPerformId, selectedRound, currentQuizResultKey)
      setSeatResult(data)
      
      // Auto-select first zone if available
      if (data?.data?.seat_available?.length > 0) {
        setSelectedZone(data.data.seat_available[0].id)
      }
    } catch (error: any) {
      alert('Error: ' + error.message)
    } finally {
      setLoadingSeat(false)
    }
  }

  const handleGetSeat = async () => {
    if (!token || !performId || !selectedRound || !selectedZone) {
      alert('Missing required information to fetch seats')
      return
    }
    const selectedRoundObject = rounds.find((r: any) => r.roundId === selectedRound)
    const targetPerformId = selectedPerformance || selectedRoundObject?.performId || performId

    setLoadingSeatDetail(true)
    setSelectedSeats([])
    setReserveResult(null)
    setPollingStatus('')
    try {
      const data = await getSeat(token, targetPerformId, selectedRound, selectedZone, quizResultKey)
      setSeatDetailResult(data)
    } catch (error: any) {
      alert('Error: ' + error.message)
    } finally {
      setLoadingSeatDetail(false)
    }
  }

  const runReservationLoop = async (zoneReservations: any[]) => {
    setLoadingReserve(true)
    setReserveResult(null)
    setPollingStatus('Starting reservation...')
    
    try {
      for (const payloadObj of zoneReservations) {
        const payload = payloadObj as any;
        setPollingStatus(`Requesting reservation for zone ${payload.zoneId}...`)
        const initialResult = await reserveSeat(token, atkZData, payload, quizResultKey)
        
        if (initialResult.success && initialResult.data?.uuid) {
          const { uuid, waitTime, retry } = initialResult.data
          let currentRetry = 0
          const maxRetries = retry || 10
          const delay = (waitTime || 5) * 1000

          setReserveResult(initialResult)

          // Polling Loop
          while (currentRetry < maxRetries) {
            currentRetry++
            setPollingStatus(`Polling status... (${currentRetry}/${maxRetries})`)
            
            // Wait before checking
            await new Promise(resolve => setTimeout(resolve, delay))
            
            const checkResult = await checkBooking(token, uuid, quizResultKey)
            setReserveResult(checkResult)

            if (checkResult.success) {
              setPollingStatus('Reservation Successful!')
              alert('จองตั๋วสำเร็จ!')
              return // Exit after success
            } else if (checkResult.code !== '51002') {
              // Any error other than "waiting"
              throw new Error(checkResult.message || 'Polling failed')
            }
          }
          throw new Error('Reached maximum retry limit')
        } else {
          throw new Error(initialResult.message || 'Initial reservation failed')
        }
      }
    } catch (error: any) {
      setPollingStatus(`Error: ${error.message}`)
      alert('Reservation Error: ' + error.message)
    } finally {
      setLoadingReserve(false)
    }
  }

  const resumeBotBooking = async (key: string, targetRoundId?: string) => {
    const activeRound = targetRoundId || selectedRound
    setPollingStatus('Resuming automatic booking...')
    try {
      const selectedRoundObject = rounds.find((r: any) => r.roundId === activeRound)
      const targetPerformId = selectedPerformance || selectedRoundObject?.performId || performId

      setPollingStatus('Checking seat availability...')
      const availData = await getSeatAvailable(token, targetPerformId, activeRound, key)
      setSeatResult(availData)

      let activeZone = selectedZone

      if (bookingMode === 'auto') {
        // If no zone is selected, automatically pick the first zone that has enough seats
        if (!activeZone) {
          const availableZones = availData?.data?.seat_available || []
          const match = availableZones.find((z: any) => {
            const amtVal = z.amount;
            if (amtVal === undefined || amtVal === null) return false;
            if (typeof amtVal === 'number') {
              return amtVal >= botSeatAmount;
            }
            const amtStr = String(amtVal).trim().toLowerCase();
            if (amtStr === '0' || amtStr === 'เต็ม' || amtStr === 'sold out' || amtStr === 'soldout' || amtStr === 'หมด') {
              return false;
            }
            const parsed = parseInt(amtStr, 10);
            if (!isNaN(parsed)) {
              return parsed >= botSeatAmount;
            }
            // Standing/Festival zones typically return strings like "Available" or "มีที่ว่าง"
            return true;
          })
          if (match) {
            activeZone = match.id
            setSelectedZone(activeZone)
            logDebug(`Auto-selected Zone: ${activeZone}`)
          } else {
            throw new Error(`ไม่พบโซนที่มีที่นั่งว่างเพียงพอสำหรับจำนวนที่ระบุ (${botSeatAmount} ที่นั่ง)`)
          }
        }

        setPollingStatus('Loading seat map...')
        const detailData = await getSeat(token, targetPerformId, activeRound, activeZone, key)
        setSeatDetailResult(detailData)

        const subZonesList = detailData?.data?.seats_available || []
        const zoneType = detailData?.data?.zone_type || 'SEAT'
        const zoneInfo = (availData?.data?.seat_available || []).find((z: any) => z.id === activeZone)
        const isNonSeatZone = zoneInfo 
          ? (zoneInfo.type === 'NONSEAT' || zoneInfo.type === 'NON_SEAT')
          : (zoneType === 'NONSEAT' || (zoneType !== 'SEAT' && subZonesList.length === 0))

        if (isNonSeatZone) {
          const payload = {
            performId: targetPerformId,
            roundId: activeRound,
            zoneId: activeZone,
            screenLabel: activeZone,
            seatTo: {
              seatType: 'NONSEAT',
              seatAmount: String(botSeatAmount)
            },
            shirtTo: [],
            consents: [{ consentId: consentId || 'SF1', consentvalue: 'Y' }]
          }
          await runReservationLoop([payload])
        } else {
          let foundSeats: any[] = [];
          for (const sz of subZonesList) {
            const seats = sz.seat || [];
            for (const seat of seats) {
              if (seat.status === 'A') {
                foundSeats.push({
                  seatId: `${seat.rowName}_${seat.seatNo}`,
                  zoneId: sz.zoneId,
                  screenLabel: sz.screenLabel,
                  zoneType: zoneType
                });
                if (foundSeats.length >= botSeatAmount) break;
              }
            }
            if (foundSeats.length >= botSeatAmount) break;
          }

          if (foundSeats.length < botSeatAmount) {
            throw new Error(`ไม่พบที่นั่งว่าง ${botSeatAmount} ที่ติดกัน/ว่างในโซน ${activeZone}`)
          }

          logDebug(`Auto-selected seats in ${activeZone}: ${foundSeats.map(s => s.seatId).join(', ')}`)
          const groupedRes = foundSeats.reduce((acc: any, curr: any) => {
            if (!acc[curr.zoneId]) {
              acc[curr.zoneId] = {
                performId: targetPerformId,
                roundId: activeRound,
                zoneId: curr.zoneId,
                screenLabel: curr.screenLabel,
                seatTo: {
                  seatType: curr.zoneType,
                  seats: []
                },
                shirtTo: [],
                consents: [{ consentId: consentId || 'SF1', consentvalue: 'Y' }]
              }
            }
            acc[curr.zoneId].seatTo.seats.push(curr.seatId)
            return acc;
          }, {})

          await runReservationLoop(Object.values(groupedRes))
        }
        setBotRunning(false)
      } else {
        // MANUAL MODE:
        // If a zone is already selected, load its seat map directly.
        // If no zone is selected, show the Modal but start on the Zone selection screen.
        if (activeZone) {
          setPollingStatus('Loading seat map...')
          const detailData = await getSeat(token, targetPerformId, activeRound, activeZone, key)
          setSeatDetailResult(detailData)
        } else {
          setSeatDetailResult(null)
        }
        setPollingStatus('Paused: Please select zone/seats in the modal.')
        setShowSeatModal(true)
      }
    } catch (error: any) {
      alert('Error during automated flow: ' + error.message)
      setPollingStatus('Error: ' + error.message)
      setBotRunning(false)
    }
  }

  const handleStartBooking = async () => {
    if (!token) {
      alert('Token is required')
      return
    }
    
    const activePerfId = selectedPerformance || performId
    if (!activePerfId) {
      alert('Perform ID is required')
      return
    }
    
    let activeRound = selectedRound
    if (!activeRound) {
      if (rounds.length > 0) {
        activeRound = rounds[0].roundId
        setSelectedRound(activeRound)
        logDebug(`Auto-selected round: ${activeRound}`)
      } else {
        alert('Please load Concert Rounds first')
        return
      }
    }

    if (bookingMode === 'auto' && botSeatAmount > maxSeatLimit) {
      alert(`จำนวนที่นั่งระบุเกินที่กำหนด (สูงสุดได้ ${maxSeatLimit} ที่นั่งสำหรับคอนเสิร์ตนี้)`)
      return
    }

    setBotRunning(true)
    setPollingStatus('Starting automatic booking...')
    logDebug('Auto Booking Initiated.')

    const selectedRoundObject = rounds.find((r: any) => r.roundId === activeRound)
    const targetPerformId = selectedPerformance || selectedRoundObject?.performId || activePerfId
    let currentQuizResultKey = quizResultKey

    try {
      const selectedPerfObject = performances.find((p: any) => p.performId === targetPerformId)
      if (selectedPerfObject?.hasQuiz && !currentQuizResultKey) {
        logDebug(`Performance requires quiz! Fetching question...`)
        setPollingStatus('Performance requires quiz! Fetching question...')
        const requestStartTime = Date.now()
        setQuizSentTime(requestStartTime)
        const quizInfo = await getQuestionInTab(token, targetPerformId, selectedPerfObject.qtoken)
        
        if (quizInfo?.data?.success && quizInfo?.data?.data?.question) {
          const quizData = quizInfo.data.data
          const questionObj = quizData.question || {}
          const answers = questionObj.answers || quizData.answers || []
          const qid = questionObj.qid || quizData.qid || ''
          let currentAtkQData = quizInfo.responseAtkQData
          let solvedKey = ''

          if (autoSolve) {
            let waitSeconds = 5
            const jwt = decodeJwt(currentAtkQData)
            if (jwt && jwt.nbf && jwt.iat) {
              const elapsedSinceSent = (Date.now() - requestStartTime) / 1000
              waitSeconds = (jwt.nbf - jwt.iat) - elapsedSinceSent
              logDebug(`JWT anti-bot wait: ${waitSeconds.toFixed(3)}s`)
            } else {
              const waitSecondsFallback = quizData.timer || questionObj.timer || 5
              const elapsedSinceSent = (Date.now() - requestStartTime) / 1000
              waitSeconds = waitSecondsFallback - elapsedSinceSent
            }

            const waitMs = Math.max(0, waitSeconds + 0.2) * 1000
            if (waitMs > 0) {
              setPollingStatus(`Waiting ${(waitMs / 1000).toFixed(1)}s for quiz activation...`)
              await new Promise(resolve => setTimeout(resolve, waitMs))
            }

            setPollingStatus(`Auto-solving quiz... Trying ${answers.length} options.`)
            for (let i = 0; i < answers.length; i++) {
              const ans = answers[i]
              setPollingStatus(`Trying choice ${i + 1}/${answers.length}: "${ans.text}"...`)
              try {
                const checkRes = await checkAnswerInTab(
                  token,
                  targetPerformId,
                  currentAtkQData,
                  qid,
                  ans.id,
                  ans.text
                )
                if (checkRes.responseAtkQData) {
                  currentAtkQData = checkRes.responseAtkQData
                }
                if (checkRes.data?.success && checkRes.data?.data?.quizResultKey) {
                  solvedKey = checkRes.data.data.quizResultKey
                  updateQuizResultKey(solvedKey)
                  currentQuizResultKey = solvedKey
                  setPollingStatus(`Quiz solved with choice: "${ans.text}"!`)
                  break
                }
              } catch (err: any) {
                logDebug(`Choice "${ans.text}" failed: ${err.message}`)
              }
            }
          }

          if (!solvedKey) {
            logDebug('Auto-solve failed or disabled. Paused for manual input.')
            setQuizQuestion(quizData)
            setResponseAtkQData(currentAtkQData)
            setSelectedAnswer(null)
            setPollingStatus('Auto-solve failed. Please select the correct answer to resume.')
            return
          }
        } else {
          throw new Error(quizInfo?.data?.message || 'Failed to fetch quiz question')
        }
      }
      await resumeBotBooking(currentQuizResultKey, activeRound)
    } catch (error: any) {
      alert('Error during automated flow: ' + error.message)
      setPollingStatus('Error: ' + error.message)
      setBotRunning(false)
    }
  }

  const handleModalSelectZone = async (zoneId: string) => {
    setSelectedZone(zoneId)
    setSeatDetailResult(null) // Clear previous seat map results
    setLoadingSeatDetail(true)
    try {
      const selectedRoundObject = rounds.find((r: any) => r.roundId === selectedRound)
      const targetPerformId = selectedPerformance || selectedRoundObject?.performId || performId
      const data = await getSeat(token, targetPerformId, selectedRound, zoneId, quizResultKey)
      setSeatDetailResult(data)
    } catch (err: any) {
      alert('Error fetching seats: ' + err.message)
    } finally {
      setLoadingSeatDetail(false)
    }
  }

  const handleConfirmModalReserve = async () => {
    const zoneInfo = zones.find((z: any) => z.id === selectedZone)
    const zoneType = seatDetailResult?.data?.zone_type
    const isNonSeatZone = zoneInfo 
      ? (zoneInfo.type === 'NONSEAT' || zoneInfo.type === 'NON_SEAT')
      : (!!seatDetailResult && (
          zoneType === 'NONSEAT' || 
          (zoneType !== 'SEAT' && (subZones.length === 0 || subZones.every((sz: any) => sz.zone_type === 'NONSEAT')))
        ))

    if (isNonSeatZone) {
      setShowSeatModal(false)
      setPollingStatus('Confirming standing tickets from modal...')
      const selectedRoundObject = rounds.find((r: any) => r.roundId === selectedRound)
      const targetPerformId = selectedPerformance || selectedRoundObject?.performId || performId
      const payload = {
        performId: targetPerformId,
        roundId: selectedRound,
        zoneId: selectedZone,
        screenLabel: selectedZone,
        seatTo: {
          seatType: 'NONSEAT',
          seatAmount: String(botSeatAmount)
        },
        shirtTo: [],
        consents: [{ consentId: consentId || 'SF1', consentvalue: 'Y' }]
      }
      await runReservationLoop([payload])
      setBotRunning(false)
      return
    }

    if (selectedSeats.length === 0) {
      alert('กรุณาเลือกที่นั่งอย่างน้อย 1 ที่นั่ง')
      return
    }
    const limit = bookingMode === 'auto' ? botSeatAmount : maxSeatLimit
    if (selectedSeats.length > limit) {
      alert(`คุณสามารถเลือกที่นั่งได้ไม่เกิน ${limit} ที่นั่ง`)
      return
    }
    setShowSeatModal(false)
    setPollingStatus('Confirming seats from modal and reserving...')
    
    const zoneReservations = Object.values(groupedReservation)
    await runReservationLoop(zoneReservations)
    setBotRunning(false)
  }

  const handleReserve = async () => {
    if (!token) {
      alert('Token is required')
      return
    }

    const zoneReservations = Object.values(groupedReservation)
    if (zoneReservations.length === 0) {
      alert('No seats selected')
      return
    }

    await runReservationLoop(zoneReservations)
  }

  const handleDirectReserve = async () => {
    if (!token || !selectedZone || !selectedRound) {
      alert('Token, Round, and Zone are required for direct reserve')
      return
    }

    const selectedRoundObject = rounds.find((r: any) => r.roundId === selectedRound)
    const targetPerformId = selectedPerformance || selectedRoundObject?.performId || performId

    const seatList = manualSeats.split(',').map(s => s.trim()).filter(s => s !== '')
    const isNonSeat = seatList.length === 0
    
    const zoneInfo = zones.find((z: any) => z.id === selectedZone)
    const subZoneInfo = subZones.find((sz: any) => sz.zoneId === selectedZone)

    const payload: any = {
      performId: targetPerformId,
      roundId: selectedRound,
      zoneId: selectedZone,
      screenLabel: subZoneInfo?.screenLabel || zoneInfo?.name || selectedZone,
      seatTo: isNonSeat ? {
        seatType: 'NONSEAT',
        seatAmount: seatAmount || '1'
      } : {
        seatType: seatDetailResult?.data?.zone_type || 'SEAT',
        seats: seatList
      },
      shirtTo: [],
      consents: [{ consentId: consentId || 'SF1', consentvalue: 'Y' }]
    }

    await runReservationLoop([payload])
  }

  const toggleSeat = (seat: any, subZone: any) => {
    if (seat.status !== 'A') return

    const seatKey = `${subZone.zoneId}-${seat.rowName}_${seat.seatNo}`
    const isSelected = selectedSeats.find(s => s.key === seatKey)

    if (isSelected) {
      setSelectedSeats(selectedSeats.filter(s => s.key !== seatKey))
    } else {
      const limit = bookingMode === 'auto' ? botSeatAmount : maxSeatLimit
      if (selectedSeats.length >= limit) {
        alert(`คุณสามารถเลือกที่นั่งได้สูงสุดคือ ${limit} ที่นั่ง`)
        return
      }
      setSelectedSeats([...selectedSeats, {
        key: seatKey,
        seatId: `${seat.rowName}_${seat.seatNo}`,
        zoneId: subZone.zoneId,
        screenLabel: subZone.screenLabel,
        zoneType: seatDetailResult?.data?.zone_type || 'SEAT'
      }])
    }
  }

  const zones = seatResult?.data?.seat_available || []
  const subZones = seatDetailResult?.data?.seats_available || []

  // Group selected seats by sub-zone to prepare JSON structure
  const groupedReservation = selectedSeats.reduce((acc: any, curr: any) => {
    const selectedRoundObject = rounds.find((r: any) => r.roundId === selectedRound)
    const targetPerformId = selectedPerformance || selectedRoundObject?.performId || performId

    if (!acc[curr.zoneId]) {
      acc[curr.zoneId] = {
        performId: targetPerformId,
        roundId: selectedRound,
        zoneId: curr.zoneId,
        screenLabel: curr.screenLabel,
        seatTo: {
          seatType: curr.zoneType,
          seats: []
        },
        shirtTo: [],
        consents: [{ consentId: consentId || 'SF1', consentvalue: 'Y' }]
      }
    }
    acc[curr.zoneId].seatTo.seats.push(curr.seatId)
    return acc;
  }, {})

  const filteredEntries = entries.filter(item => {
    if (storageTypeFilter !== 'all' && item.type !== storageTypeFilter) {
      return false
    }
    if (storageSearch.trim() !== '') {
      const q = storageSearch.toLowerCase()
      return item.key.toLowerCase().includes(q) || item.value.toLowerCase().includes(q)
    }
    return true
  })

  return (
    <div className="app-container">
      {/* Left Column: Main Application Logic */}
      <div className="main-content">
        <h1 style={{ 
          fontSize: '18px', 
          fontWeight: 'bold', 
          color: 'var(--primary)', 
          textAlign: 'center',
          margin: '0 0 12px 0'
        }}>
          AllTicket Bot by Sungjintwo
        </h1>

        {/* Form Settings Card */}
        <div className="card" style={{ marginBottom: '12px' }}>
          <div 
            onClick={() => setShowSettings(!showSettings)} 
            style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              cursor: 'pointer',
              userSelect: 'none',
              borderBottom: showSettings ? '1px solid var(--border-color)' : 'none',
              paddingBottom: showSettings ? '8px' : '0'
            }}
          >
            <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              ⚙️ Configuration Settings
            </span>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              {showSettings ? '▲ Hide' : '▼ Show'}
            </span>
          </div>

          {showSettings && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
              <div className="input-group">
                <label className="input-label">Authorization Token</label>
                <input 
                  type="text" 
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="Authorization token..."
                  className="input-field"
                />
              </div>
              
              <div style={{ display: 'flex', gap: '8px' }}>
                <div className="input-group" style={{ flex: 1 }}>
                  <label className="input-label">Perform ID (Event ID)</label>
                  <input 
                    type="text" 
                    value={performId}
                    onChange={(e) => setPerformId(e.target.value)}
                    placeholder="Event ID (e.g. 26069)..."
                    className="input-field"
                  />
                </div>
                <div className="input-group" style={{ flex: 1 }}>
                  <label className="input-label">Consent ID</label>
                  <input 
                    type="text" 
                    value={consentId}
                    onChange={(e) => updateConsentId(e.target.value)}
                    placeholder="Consent ID (e.g. SF1)..."
                    className="input-field"
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <div className="input-group" style={{ flex: 1 }}>
                  <label className="input-label">atk-z-data</label>
                  <input 
                    readOnly={true}
                    type="text" 
                    value={atkZData}
                    placeholder="Auto-filled..."
                    className="input-field"
                    style={{ backgroundColor: '#f1f5f9', color: '#64748b', cursor: 'not-allowed' }}
                  />
                </div>
                <div className="input-group" style={{ flex: 1 }}>
                  <label className="input-label">Quiz Result Key</label>
                  <input 
                    readOnly={true}
                    type="text" 
                    value={quizResultKey}
                    placeholder="Auto-filled..."
                    className="input-field"
                    style={{ backgroundColor: '#f1f5f9', color: '#64748b', cursor: 'not-allowed' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', margin: '4px 0' }}>
                <input 
                  type="checkbox" 
                  id="auto-solve-quiz"
                  checked={autoSolve}
                  onChange={(e) => setAutoSolve(e.target.checked)}
                  style={{ cursor: 'pointer' }}
                />
                <label htmlFor="auto-solve-quiz" style={{ fontWeight: '600', fontSize: '11px', cursor: 'pointer', userSelect: 'none' }}>
                  Auto-solve Quiz
                </label>
              </div>

              <button 
                onClick={() => handleGetRound(false)}
                disabled={loading}
                className="btn btn-primary"
                style={{ width: '100%', padding: '10px' }}
              >
                {loading ? 'Fetching Rounds...' : '1. Get Round API'}
              </button>
            </div>
          )}
        </div>

        {/* Steps Scroll Area */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingRight: '4px' }}>
          
          {/* Automated Booking Control Panel */}
          <div className="card" style={{ border: '2.5px solid var(--primary)', background: '#f5f3ff', padding: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: '800', fontSize: '12px', color: 'var(--primary-hover)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                🚀 Auto-Booking System
              </span>
              <span style={{ 
                fontSize: '8px', 
                padding: '2px 6px', 
                borderRadius: '9999px', 
                backgroundColor: botRunning ? '#fee2e2' : '#f1f5f9', 
                color: botRunning ? '#ef4444' : '#64748b',
                fontWeight: 'bold'
              }}>
                {botRunning ? 'BOT ACTIVE' : 'IDLE'}
              </span>
            </div>
            
            <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '3px' }}>
                <label style={{ fontSize: '9px', fontWeight: 'bold', color: '#4b5563' }}>Booking Mode</label>
                <select 
                  value={bookingMode} 
                  onChange={(e) => {
                    const mode = e.target.value as 'auto' | 'manual';
                    setBookingMode(mode);
                    // Clear selected seats when changing modes
                    setSelectedSeats([]);
                  }}
                  className="input-field"
                  style={{ padding: '4px 6px', fontSize: '10px' }}
                >
                  <option value="manual">Manual Selection (เลือกที่นั่งเอง)</option>
                  <option value="auto">Auto Selection (เลือกอัตโนมัติ)</option>
                </select>
              </div>
              
              {bookingMode === 'auto' && (
                <div style={{ width: '110px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  <label style={{ fontSize: '9px', fontWeight: 'bold', color: '#4b5563' }}>
                    Tickets (Max: {maxSeatLimit})
                  </label>
                  <input 
                    type="number" 
                    min={1} 
                    max={maxSeatLimit}
                    value={botSeatAmount} 
                    onChange={(e) => {
                      const amt = Math.max(1, Math.min(maxSeatLimit, Number(e.target.value)));
                      setBotSeatAmount(amt);
                      // Clear selected seats when changing count
                      setSelectedSeats([]);
                    }}
                    className="input-field"
                    style={{ padding: '4px 6px', fontSize: '10px' }}
                  />
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
              <button 
                onClick={handleStartBooking}
                disabled={botRunning || rounds.length === 0}
                className="btn btn-primary"
                style={{ flex: 1, padding: '8px', fontWeight: '800', fontSize: '11px', textTransform: 'uppercase' }}
              >
                {botRunning ? 'Processing Booking...' : '🚀 Start Automated Booking'}
              </button>
              {botRunning && (
                <button 
                  onClick={() => {
                    setBotRunning(false);
                    setPollingStatus('Stopped by user.');
                  }}
                  className="btn btn-danger"
                  style={{ padding: '8px 12px', fontSize: '11px' }}
                >
                  Stop
                </button>
              )}
            </div>

            {pollingStatus && (
              <div style={{ 
                marginTop: '6px', 
                fontSize: '10px', 
                fontWeight: '600', 
                color: 'var(--primary)',
                textAlign: 'center',
                padding: '4px 6px',
                backgroundColor: '#ffffff',
                borderRadius: '4px',
                border: '1px solid #e2e8f0'
              }}>
                Status: {pollingStatus}
              </div>
            )}
          </div>

          {quizQuestion && (
            <div className="card" style={{ border: '2px solid var(--primary)', backgroundColor: '#eff6ff' }}>
              <div style={{ fontWeight: 'bold', fontSize: '13px', color: 'var(--primary)', display: 'flex', justifyContent: 'space-between' }}>
                <span>Quiz Required</span>
                <span>{quizQuestion.countdown || 45}s</span>
              </div>
              
              <div style={{ 
                fontSize: '12px', 
                fontWeight: '600', 
                backgroundColor: '#ffffff', 
                padding: '8px', 
                borderRadius: '4px',
                border: '1px solid #bfdbfe'
              }}>
                {quizQuestion.question?.textTh || quizQuestion.textTh}
                {(quizQuestion.question?.textEn || quizQuestion.textEn) && (
                  <div style={{ color: '#4b5563', fontSize: '11px', marginTop: '4px' }}>
                    {quizQuestion.question?.textEn || quizQuestion.textEn}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {quizQuestion.answers?.map((ans: any) => (
                  <label key={ans.id} style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '8px', 
                    fontSize: '12px', 
                    cursor: 'pointer',
                    padding: '6px',
                    borderRadius: '4px',
                    backgroundColor: selectedAnswer?.id === ans.id ? '#dbeafe' : '#ffffff',
                    border: '1px solid',
                    borderColor: selectedAnswer?.id === ans.id ? 'var(--primary)' : '#d1d5db',
                  }}>
                    <input 
                      type="radio" 
                      name="quiz-answer" 
                      value={ans.id}
                      checked={selectedAnswer?.id === ans.id}
                      onChange={() => setSelectedAnswer(ans)}
                      style={{ cursor: 'pointer' }}
                    />
                    <span>{ans.text}</span>
                  </label>
                ))}
              </div>

              <button 
                onClick={handleAnswerQuiz}
                disabled={quizLoading || !selectedAnswer}
                className="btn btn-primary"
                style={{ width: '100%', padding: '10px' }}
              >
                {quizLoading ? 'Verifying Answer...' : 'Submit Answer'}
              </button>

              <details style={{ marginTop: '4px', fontSize: '10px' }}>
                <summary style={{ cursor: 'pointer', color: '#4b5563' }}>Raw Quiz Data</summary>
                <pre style={{ overflowX: 'auto', backgroundColor: '#f3f4f6', padding: '4px', borderRadius: '4px', whiteSpace: 'pre-wrap' }}>
                  {JSON.stringify(quizQuestion, null, 2)}
                </pre>
              </details>
            </div>
          )}

          {performances.length > 0 && (
            <div className="card" style={{ border: '1px solid var(--primary)', backgroundColor: '#f8fafc' }}>
              <label style={{ fontWeight: '700', color: 'var(--primary)', fontSize: '13px' }}>1. Select Show Date / Location (Performance)</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px' }}>
                {performances.map((perf: any) => (
                  <label key={perf.performId} style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '8px', 
                    fontSize: '13px', 
                    cursor: 'pointer',
                    padding: '8px',
                    borderRadius: '4px',
                    backgroundColor: selectedPerformance === perf.performId ? '#e0f2fe' : 'transparent',
                    border: '1px solid',
                    borderColor: selectedPerformance === perf.performId ? '#0284c7' : 'transparent',
                  }}>
                    <input 
                      type="radio" 
                      name="performance" 
                      value={perf.performId}
                      checked={selectedPerformance === perf.performId}
                      onChange={() => handleSelectPerformance(perf.performId)}
                      style={{ cursor: 'pointer' }}
                    />
                    <span style={{ fontWeight: selectedPerformance === perf.performId ? '600' : '400', color: 'var(--text-main)' }}>
                      [{perf.performId}] {perf.performNameTh || perf.performNameEn}
                      {perf.hasQuiz && <span style={{ color: 'var(--danger)', marginLeft: '6px', fontWeight: 'bold' }}>(Quiz 🧩)</span>}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {rounds.length > 0 && (
            <div className="card" style={{ border: '1px solid var(--primary)', backgroundColor: '#eff6ff' }}>
              <label style={{ fontWeight: '700', color: 'var(--primary)', fontSize: '13px' }}>2. Select Concert Round (Time Slot)</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px' }}>
                {rounds.map((round: any) => (
                  <label key={round.roundId} style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '8px', 
                    fontSize: '13px', 
                    cursor: 'pointer',
                    padding: '8px',
                    borderRadius: '4px',
                    backgroundColor: selectedRound === round.roundId ? '#dbeafe' : 'transparent',
                    border: '1px solid',
                    borderColor: selectedRound === round.roundId ? 'var(--primary)' : 'transparent',
                  }}>
                    <input 
                      type="radio" 
                      name="round" 
                      value={round.roundId}
                      checked={selectedRound === round.roundId}
                      onChange={() => setSelectedRound(round.roundId)}
                      style={{ cursor: 'pointer' }}
                    />
                    <span style={{ fontWeight: selectedRound === round.roundId ? '600' : '400', color: 'var(--text-main)' }}>
                      [{round.roundId}] {round.roundLabel}
                    </span>
                  </label>
                ))}
              </div>

              <button 
                onClick={handleGetSeatAvailable}
                disabled={loadingSeat || !selectedRound}
                className="btn btn-secondary"
                style={{ width: '100%', padding: '10px', marginTop: '4px', fontSize: '12px' }}
              >
                {loadingSeat ? 'Fetching Seats...' : '3. Get Seat Available API'}
              </button>
            </div>
          )}

          {zones.length > 0 && (
            <div className="card" style={{ border: '1px solid var(--secondary)', backgroundColor: '#ecfdf5' }}>
              <label style={{ fontWeight: '600', color: 'var(--secondary-hover)', fontSize: '13px' }}>4. Select Zone</label>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(3, 1fr)', 
                gap: '6px' 
              }}>
                {zones.map((zone: any) => (
                  <div 
                    key={zone.id} 
                    onClick={() => setSelectedZone(zone.id)}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '6px 4px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      border: '2px solid',
                      transition: 'all 0.2s',
                      backgroundColor: selectedZone === zone.id ? 'var(--secondary)' : '#ffffff',
                      borderColor: selectedZone === zone.id ? 'var(--secondary-hover)' : '#d1d5db',
                      color: selectedZone === zone.id ? '#ffffff' : '#374151',
                    }}
                  >
                    <span style={{ fontSize: '13px', fontWeight: 'bold' }}>{zone.name}</span>
                    <span style={{ fontSize: '9px', opacity: 0.9 }}>
                      {typeof zone.amount === 'number' ? `${zone.amount} seats` : zone.amount}
                    </span>
                  </div>
                ))}
              </div>
              
              {selectedZone && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px', borderTop: '1px solid var(--secondary)', paddingTop: '8px' }}>
                  <div style={{ 
                    fontSize: '11px', 
                    fontWeight: '600', 
                    color: 'var(--secondary-hover)',
                    textAlign: 'center'
                  }}>
                    Selected Zone ID: <span style={{ color: 'var(--danger)', fontSize: '13px' }}>{selectedZone}</span>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 2 }}>
                      <label style={{ fontSize: '10px', fontWeight: 'bold' }}>Manual Seat IDs (e.g. A_1, A_2)</label>
                      <input 
                        type="text" 
                        value={manualSeats}
                        onChange={(e) => setManualSeats(e.target.value)}
                        placeholder="Leave empty for NONSEAT"
                        className="input-field"
                      />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                      <label style={{ fontSize: '10px', fontWeight: 'bold' }}>Amount</label>
                      <input 
                        type="number" 
                        value={seatAmount}
                        onChange={(e) => setSeatAmount(e.target.value)}
                        min="1"
                        className="input-field"
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button 
                      onClick={handleGetSeat}
                      disabled={loadingSeatDetail}
                      className="btn btn-primary"
                      style={{ flex: 1 }}
                    >
                      {loadingSeatDetail ? 'Fetching...' : '5. Get Seat Detail'}
                    </button>
                    <button 
                      onClick={handleDirectReserve}
                      disabled={loadingReserve || !token}
                      className="btn btn-danger"
                      style={{ flex: 1 }}
                    >
                      {loadingReserve ? 'Reserving...' : 'Direct Reserve (No Map)'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {subZones.length > 0 && (
            <div className="card" style={{ border: '1px solid var(--primary)', backgroundColor: '#f5f3ff' }}>
              <label style={{ fontWeight: '600', color: '#4338ca', fontSize: '13px' }}>6. Select Seats</label>
              
              {subZones.map((sz: any) => {
                const zoneInfo = zones.find((z: any) => z.id === selectedZone);
                const isNonSeatZone = zoneInfo 
                  ? (zoneInfo.type === 'NONSEAT' || zoneInfo.type === 'NON_SEAT')
                  : (sz.zone_type === 'NONSEAT' || (sz.seat && sz.seat.length === 0));
                
                // Group seats by rowName
                const groupedByRow = (sz.seat || []).reduce((acc: any, s: any) => {
                  if (!acc[s.rowName]) acc[s.rowName] = [];
                  acc[s.rowName].push(s);
                  return acc;
                }, {});

                return (
                  <div key={sz.zoneId} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#4f46e5', borderBottom: '1px solid #e0e7ff', paddingBottom: '4px' }}>
                      Sub-Zone: {sz.zoneId} ({sz.priceAmt} THB) {isNonSeatZone && <span style={{ color: 'var(--danger)' }}>[NON-SEAT]</span>}
                    </div>
                    
                    {isNonSeatZone ? (
                      <div style={{ 
                        padding: '12px', 
                        backgroundColor: '#ffffff', 
                        borderRadius: '6px', 
                        textAlign: 'center',
                        border: '1px dashed #d1d5db'
                      }}>
                        <div style={{ fontSize: '11px', marginBottom: '8px', color: '#6b7280' }}>
                          This is a Non-Seat / Festival zone.
                        </div>
                        <button 
                          onClick={handleDirectReserve}
                          disabled={loadingReserve || !token}
                          className="btn btn-secondary"
                        >
                          {loadingReserve ? 'Reserving...' : `Reserve ${seatAmount} Ticket(s) Now`}
                        </button>
                      </div>
                    ) : (
                      <div style={{ 
                        display: 'flex', 
                        flexDirection: 'column',
                        gap: '6px',
                        padding: '6px',
                        backgroundColor: '#ffffff',
                        borderRadius: '6px',
                        maxHeight: '200px',
                        overflowY: 'auto',
                        border: '1px solid #f3f4f6'
                      }}>
                        {Object.entries(groupedByRow).map(([rowName, seats]: [string, any]) => (
                          <div key={rowName} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ 
                              width: '20px', 
                              fontSize: '10px', 
                              fontWeight: 'bold', 
                              color: '#6366f1',
                              textAlign: 'center',
                              flexShrink: 0
                            }}>
                              {rowName}
                            </div>
                            <div style={{ 
                              display: 'flex', 
                              flexWrap: 'wrap', 
                              gap: '4px'
                            }}>
                              {seats.map((s: any, idx: number) => {
                                const seatKey = `${sz.zoneId}-${s.rowName}_${s.seatNo}`;
                                const isSelected = selectedSeats.some(sel => sel.key === seatKey);
                                const isAvailable = s.status === 'A';
                                
                                return (
                                  <div 
                                    key={idx}
                                    onClick={() => toggleSeat(s, sz)}
                                    title={`${s.rowName}${s.seatNo} - ${isAvailable ? 'Available' : 'Sold'}`}
                                    style={{
                                      width: '18px',
                                      height: '18px',
                                      borderRadius: '3px',
                                      fontSize: '8px',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      cursor: isAvailable ? 'pointer' : 'not-allowed',
                                      backgroundColor: isSelected ? 'var(--danger)' : (isAvailable ? 'var(--secondary)' : '#d1d5db'),
                                      color: 'white',
                                      border: '1px solid rgba(0,0,0,0.1)',
                                      userSelect: 'none'
                                    }}
                                  >
                                    {s.seatNo}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}

              {selectedSeats.length > 0 && (
                <div style={{ 
                  marginTop: '8px', 
                  padding: '8px', 
                  backgroundColor: '#ffffff', 
                  borderRadius: '6px', 
                  border: '1px solid #e0e7ff' 
                }}>
                  <label style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--danger)' }}>Selected JSON Body:</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '6px' }}>
                    {Object.values(groupedReservation).map((res: any) => (
                      <textarea 
                        key={res.zoneId}
                        readOnly 
                        rows={4}
                        style={{ 
                          width: '100%', 
                          padding: '6px', 
                          fontSize: '10px', 
                          fontFamily: 'monospace', 
                          backgroundColor: '#f9fafb', 
                          border: '1px solid #d1d5db', 
                          borderRadius: '4px', 
                          resize: 'none',
                          boxSizing: 'border-box'
                        }}
                        value={JSON.stringify(res, null, 2)}
                      />
                    ))}
                  </div>

                  <button 
                    onClick={handleReserve}
                    disabled={loadingReserve || !token}
                    className="btn btn-danger"
                    style={{ width: '100%', padding: '12px', marginTop: '8px', fontSize: '13px' }}
                  >
                    {loadingReserve ? 'Reserving...' : 'RESERVE SEATS NOW'}
                  </button>

                  {pollingStatus && (
                    <div style={{ 
                      marginTop: '6px', 
                      fontSize: '11px', 
                      fontWeight: '600', 
                      color: 'var(--primary)',
                      textAlign: 'center',
                      padding: '4px',
                      backgroundColor: '#f5f3ff',
                      borderRadius: '4px',
                      border: '1px solid #e0e7ff'
                    }}>
                      Status: {pollingStatus}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {reserveResult && (
            <div className="card" style={{ border: '2px solid var(--danger)', backgroundColor: '#fee2e2' }}>
              <label style={{ fontWeight: '600', color: '#b91c1c', fontSize: '11px' }}>Latest API Result</label>
              <textarea 
                readOnly 
                rows={4}
                style={{ 
                  width: '100%', 
                  padding: '6px', 
                  fontSize: '9px', 
                  fontFamily: 'monospace', 
                  backgroundColor: '#ffffff', 
                  border: '1px solid #d1d5db', 
                  borderRadius: '4px', 
                  resize: 'none',
                  boxSizing: 'border-box'
                }}
                value={JSON.stringify(reserveResult, null, 2)}
              />
            </div>
          )}

          {seatDetailResult && (
            <div className="card" style={{ border: '1px solid var(--primary)', backgroundColor: '#eef2ff', opacity: 0.7 }}>
              <label style={{ fontWeight: '600', color: '#4338ca', fontSize: '11px' }}>Raw Detailed Result (Step 5)</label>
              <textarea 
                readOnly 
                rows={3}
                style={{ 
                  width: '100%', 
                  padding: '6px', 
                  fontSize: '9px', 
                  fontFamily: 'monospace', 
                  backgroundColor: '#ffffff', 
                  border: '1px solid #d1d5db', 
                  borderRadius: '4px', 
                  resize: 'none',
                  boxSizing: 'border-box'
                }}
                value={JSON.stringify(seatDetailResult, null, 2)}
              />
            </div>
          )}
        </div>
      </div>

      {/* Right Column: Tabbed Sidebar */}
      <div className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-title-row">
            <h2 className="sidebar-title">Developer Console</h2>
            {activeSidebarTab === 'logs' && debugLogs.length > 0 && (
              <div style={{ display: 'flex', gap: '4px' }}>
                <button 
                  onClick={() => copyToClipboard(debugLogs.join('\n'))} 
                  className="btn btn-ghost" 
                  style={{ padding: '3px 6px', fontSize: '10px', borderRadius: '4px' }}
                >
                  Copy All
                </button>
                <button 
                  onClick={() => setDebugLogs([])} 
                  className="btn btn-ghost" 
                  style={{ padding: '3px 6px', fontSize: '10px', borderRadius: '4px' }}
                >
                  Clear
                </button>
              </div>
            )}
            {activeSidebarTab === 'storage' && (
              <button 
                onClick={extract} 
                className="btn btn-ghost" 
                style={{ padding: '3px 6px', fontSize: '10px', borderRadius: '4px' }}
              >
                Refresh
              </button>
            )}
          </div>
          
          <div className="sidebar-tabs">
            <button 
              className={`sidebar-tab ${activeSidebarTab === 'logs' ? 'active' : ''}`}
              onClick={() => setActiveSidebarTab('logs')}
            >
              Logs ({debugLogs.length})
            </button>
            <button 
              className={`sidebar-tab ${activeSidebarTab === 'storage' ? 'active' : ''}`}
              onClick={() => setActiveSidebarTab('storage')}
            >
              Storage ({entries.length})
            </button>
          </div>

          {activeSidebarTab === 'storage' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px' }}>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input 
                  type="text" 
                  placeholder="Search keys..." 
                  value={storageSearch}
                  onChange={(e) => setStorageSearch(e.target.value)}
                  className="input-field"
                  style={{ padding: '6px 8px', paddingRight: storageSearch ? '24px' : '8px', fontSize: '10px' }}
                />
                {storageSearch && (
                  <button 
                    onClick={() => setStorageSearch('')} 
                    style={{
                      position: 'absolute',
                      right: '6px',
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      fontSize: '10px',
                      padding: 0
                    }}
                  >
                    ✕
                  </button>
                )}
              </div>
              <div style={{ display: 'flex', gap: '4px' }}>
                {(['all', 'local', 'session'] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => setStorageTypeFilter(type)}
                    className="sidebar-tab"
                    style={{
                      flex: 1,
                      padding: '4px 6px',
                      fontSize: '9px',
                      borderRadius: '4px',
                      backgroundColor: storageTypeFilter === type ? 'var(--primary)' : 'transparent',
                      color: storageTypeFilter === type ? '#ffffff' : 'var(--text-muted)',
                      border: 'none',
                      boxShadow: storageTypeFilter === type ? '0 1px 3px rgba(0, 0, 0, 0.1)' : 'none'
                    }}
                  >
                    {type.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="sidebar-content">
          {activeSidebarTab === 'logs' ? (
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, backgroundColor: '#ffffff', overflowY: 'auto' }}>
              {debugLogs.length === 0 ? (
                <div style={{ padding: '16px', fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center' }}>
                  No logs recorded yet.
                </div>
              ) : (
                debugLogs.map((log, idx) => (
                  <div key={idx} className="log-item">
                    {log}
                  </div>
                ))
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflowY: 'auto', gap: '8px', padding: '10px' }}>
              {filteredEntries.length === 0 ? (
                <div style={{ padding: '16px', fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center' }}>
                  No matching storage items found.
                </div>
              ) : (
                filteredEntries.map((item) => (
                  <div key={item.key} className="card" style={{ padding: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '4px' }}>
                      <div style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--primary)', wordBreak: 'break-all', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '4px' }}>
                        <span style={{ 
                          fontSize: '8px', 
                          padding: '1px 3px', 
                          borderRadius: '3px', 
                          backgroundColor: item.type === 'local' ? '#e0f2fe' : '#fef3c7', 
                          color: item.type === 'local' ? '#0369a1' : '#b45309',
                          fontWeight: 'bold'
                        }}>
                          {item.type.toUpperCase()}
                        </span>
                        {item.key}
                      </div>
                      <button 
                        onClick={() => copyToClipboard(item.parsed ? JSON.stringify(item.parsed, null, 2) : item.value)}
                        className="btn btn-ghost"
                        style={{ padding: '2px 6px', fontSize: '9px', borderRadius: '3px', flexShrink: 0 }}
                      >
                        Copy
                      </button>
                    </div>
                    <textarea 
                      readOnly 
                      rows={5}
                      style={{ 
                        width: '100%', 
                        padding: '6px', 
                        fontSize: '9px', 
                        fontFamily: 'monospace', 
                        backgroundColor: '#f8fafc', 
                        border: '1px solid var(--border-color)', 
                        borderRadius: '4px', 
                        resize: 'none',
                        boxSizing: 'border-box',
                        marginTop: '4px'
                      }}
                      value={item.parsed ? JSON.stringify(item.parsed, null, 2) : item.value}
                    />
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {showSeatModal && (
        (() => {
          const zoneInfo = zones.find((z: any) => z.id === selectedZone)
          const zoneType = seatDetailResult?.data?.zone_type
          const isNonSeatZone = zoneInfo 
            ? (zoneInfo.type === 'NONSEAT' || zoneInfo.type === 'NON_SEAT')
            : (!!seatDetailResult && (
                zoneType === 'NONSEAT' || 
                (zoneType !== 'SEAT' && (subZones.length === 0 || subZones.every((sz: any) => sz.zone_type === 'NONSEAT')))
              ))
          
          let totalAvailableSeats = 0
          subZones.forEach((sz: any) => {
            const seats = sz.seat || []
            seats.forEach((s: any) => {
              if (s.status === 'A') totalAvailableSeats++
            })
          })
          const isFullyBooked = !isNonSeatZone && (
            (typeof zoneInfo?.amount === 'number' && zoneInfo.amount === 0) ||
            (zoneInfo?.amount === '0' || zoneInfo?.amount === 'เต็ม' || zoneInfo?.amount === 'sold out') ||
            (!!seatDetailResult && (subZones.length === 0 || totalAvailableSeats === 0))
          )

          return (
            <div className="modal-overlay">
              <div className="modal-container">
                <div className="modal-header">
                  <h3 className="modal-title">
                    {!selectedZone 
                      ? 'กรุณาเลือกโซนที่นั่ง' 
                      : isNonSeatZone 
                        ? `ยืนยันการจองตั๋วยืน (${botSeatAmount} ใบ)` 
                        : `เลือกที่นั่ง (${selectedSeats.length} / สูงสุด ${maxSeatLimit} ที่นั่ง)`
                    }
                  </h3>
                  <button 
                    className="btn btn-ghost" 
                    style={{ padding: '3px 8px', fontSize: '12px' }}
                    onClick={() => {
                      setShowSeatModal(false);
                      setBotRunning(false);
                      setPollingStatus('Booking paused (Modal closed)');
                    }}
                  >
                    ✕
                  </button>
                </div>
                <div className="modal-body">
                  {!selectedZone ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-muted)', marginBottom: '4px' }}>
                        โซนที่นั่งที่มีอยู่:
                      </div>
                      {zones.length === 0 ? (
                        <div style={{ textAlign: 'center', fontSize: '11px', color: 'var(--text-muted)', padding: '20px' }}>
                          ไม่มีโซนว่าง
                        </div>
                      ) : (
                        zones.map((zone: any) => (
                          <button
                            key={zone.id}
                            onClick={() => handleModalSelectZone(zone.id)}
                            className="btn btn-ghost"
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              padding: '10px 12px',
                              textAlign: 'left',
                              width: '100%',
                              borderRadius: '8px',
                              border: '1px solid var(--border-color)',
                              backgroundColor: '#ffffff'
                            }}
                          >
                            <span style={{ fontWeight: 'bold', color: 'var(--text-main)', fontSize: '11px' }}>
                              โซน {zone.name}
                            </span>
                            <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '600' }}>
                              {zone.amount} ที่นั่งว่าง
                            </span>
                          </button>
                        ))
                      )}
                    </div>
                  ) : loadingSeatDetail ? (
                    <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '30px' }}>
                      <div style={{ fontWeight: 'bold', fontSize: '12px', marginBottom: '8px' }}>
                        กำลังโหลดแผนผังโซน {selectedZone}...
                      </div>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>กรุณารอสักครู่</div>
                    </div>
                  ) : (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', borderBottom: '1px solid #f1f5f9', paddingBottom: '6px' }}>
                        <button
                          onClick={() => {
                            setSelectedZone('');
                            setSeatDetailResult(null);
                          }}
                          className="btn btn-ghost"
                          style={{ padding: '3px 8px', fontSize: '9px', display: 'flex', alignItems: 'center', gap: '3px' }}
                        >
                          ⬅️ ย้อนกลับไปเลือกโซน
                        </button>
                        <span style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--primary-hover)' }}>
                          โซน: {selectedZone}
                        </span>
                      </div>

                      {isNonSeatZone ? (
                        <div style={{ padding: '16px', textAlign: 'center', backgroundColor: '#ecfdf5', borderRadius: '8px', border: '1px solid #a7f3d0' }}>
                          <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#047857', marginBottom: '6px' }}>
                            🎉 โซนนี้เป็นโซนยืน (Standing Zone)
                          </div>
                          <div style={{ fontSize: '11px', color: '#065f46', lineHeight: '1.4', marginBottom: '12px' }}>
                            ไม่มีการระบุตำแหน่งที่นั่ง สามารถเลือกจำนวนตั๋วและยืนยันเพื่อทำรายการจองทันทีด้านล่าง
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'center', justifyContent: 'center' }}>
                            <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#065f46' }}>จำนวนตั๋วที่จะจอง (สูงสุด {maxSeatLimit} ใบ):</label>
                            <select 
                              value={botSeatAmount} 
                              onChange={(e) => setBotSeatAmount(Number(e.target.value))}
                              className="input-field"
                              style={{ width: '100px', padding: '6px', textAlign: 'center', fontSize: '13px', border: '1px solid #a7f3d0' }}
                            >
                              {Array.from({ length: maxSeatLimit }, (_, i) => i + 1).map(num => (
                                <option key={num} value={num}>{num} ใบ</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      ) : isFullyBooked ? (
                        <div style={{ padding: '16px', textAlign: 'center', backgroundColor: '#fef2f2', borderRadius: '8px', border: '1px solid #fca5a5' }}>
                          <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#b91c1c', marginBottom: '6px' }}>
                            ⚠️ โซนนี้ไม่มีที่นั่งว่างเหลือแล้ว (Fully Booked)
                          </div>
                          <div style={{ fontSize: '11px', color: '#991b1b' }}>
                            กรุณากดย้อนกลับเพื่อเลือกโซนอื่นๆ แทน
                          </div>
                        </div>
                      ) : subZones.length === 0 ? (
                        <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px' }}>
                          ไม่พบแผนผังที่นั่ง
                        </div>
                      ) : (
                        subZones.map((sz: any) => {
                          const isNonSeatSubZone = sz.zone_type === 'NONSEAT' || (sz.seat && sz.seat.length === 0);
                          const groupedByRow = (sz.seat || []).reduce((acc: any, s: any) => {
                            if (!acc[s.rowName]) acc[s.rowName] = [];
                            acc[s.rowName].push(s);
                            return acc;
                          }, {});

                          return (
                            <div key={sz.zoneId} style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
                              <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#4f46e5', borderBottom: '1px solid #e0e7ff', paddingBottom: '4px' }}>
                                Sub-Zone: {sz.zoneId} ({sz.priceAmt} THB) {isNonSeatSubZone && <span style={{ color: 'var(--danger)' }}>[NON-SEAT]</span>}
                              </div>

                              <div style={{ 
                                display: 'flex', 
                                flexDirection: 'column', 
                                gap: '6px', 
                                padding: '6px', 
                                backgroundColor: '#f8fafc', 
                                borderRadius: '6px',
                                border: '1px solid #e2e8f0',
                                overflowX: 'auto'
                              }}>
                                {Object.entries(groupedByRow).map(([rowName, seats]: [string, any]) => (
                                  <div key={rowName} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <div style={{ width: '20px', fontSize: '10px', fontWeight: 'bold', color: '#6366f1', textAlign: 'center', flexShrink: 0 }}>
                                      {rowName}
                                    </div>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                      {seats.map((s: any, idx: number) => {
                                        const seatKey = `${sz.zoneId}-${s.rowName}_${s.seatNo}`;
                                        const isSelected = selectedSeats.some(sel => sel.key === seatKey);
                                        const isAvailable = s.status === 'A';
                                        
                                        return (
                                          <div 
                                            key={idx}
                                            onClick={() => toggleSeat(s, sz)}
                                            title={`${s.rowName}${s.seatNo} - ${isAvailable ? 'Available' : 'Sold'}`}
                                            style={{
                                              width: '20px',
                                              height: '20px',
                                              borderRadius: '4px',
                                              fontSize: '8px',
                                              display: 'flex',
                                              alignItems: 'center',
                                              justifyContent: 'center',
                                              cursor: isAvailable ? 'pointer' : 'not-allowed',
                                              backgroundColor: isSelected ? 'var(--danger)' : (isAvailable ? 'var(--secondary)' : '#d1d5db'),
                                              color: 'white',
                                              border: '1px solid rgba(0,0,0,0.1)',
                                              userSelect: 'none'
                                            }}
                                          >
                                            {s.seatNo}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </>
                  )}
                </div>
                <div className="modal-footer">
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginRight: 'auto', alignSelf: 'center' }}>
                    {!selectedZone 
                      ? 'เลือกโซนเพื่อไปต่อ' 
                      : isNonSeatZone 
                        ? `เตรียมจองตั๋วยืน ${botSeatAmount} ใบ` 
                        : isFullyBooked 
                          ? 'ที่นั่งเต็มหมดแล้ว' 
                          : `เลือกแล้ว ${selectedSeats.length} ที่นั่ง (สูงสุด ${maxSeatLimit})`
                    }
                  </span>
                  <button 
                    className="btn btn-ghost"
                    onClick={() => {
                      setShowSeatModal(false);
                      setBotRunning(false);
                      setPollingStatus('Booking paused');
                    }}
                  >
                    ยกเลิก
                  </button>
                  {selectedZone && !isFullyBooked && (
                    <button 
                      disabled={(!isNonSeatZone && selectedSeats.length === 0) || loadingReserve}
                      className="btn btn-danger"
                      onClick={handleConfirmModalReserve}
                    >
                      {loadingReserve ? 'กำลังจอง...' : 'ยืนยันและจองที่นั่ง'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )
        })()
      )}
    </div>
  )
}

export default App
