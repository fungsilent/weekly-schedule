import axios from 'axios'
import config from 'config'

/*
 * Config
 */
const { api, env } = config
axios.defaults.headers.post['Content-Type'] = 'application/x-www-form-urlencoded'

/*
 * Fetch function
 */
export const findWorkspace = async () => {
    try {
        const response = await fetchData(api.findWorkspace, {
            credentials: 'include',
        })

        const workspaces = response.current_teams.reduce((result, { teams }) => {
            teams.forEach(workspace => {
                result.push({
                    id: workspace.id,
                    name: workspace.name,
                    domain: workspace.domain,
                    url: workspace.url,
                })
            })
            return result
        }, [])

        return [workspaces, null]
    } catch (err) {
        console.log(`[ERROR] findWorkspace:`, err)
        return [null, err.message]
    }
}

export const fetchWorkspaceToken = async workspace => {
    try {
        const response = await fetch(api.findWorkspaceToken.replace('{workspace}', workspace), {
            credentials: 'include',
        })

        if (response.url.search(/\?redir=/) > -1) {
            return [null, 'invalid_auth']
        }

        const html = await response.text()
        const [, token] = html.match(/"api_token":"([a-z0-9-]*)/)
        localStorage.setItem(env.workspaceToken, token)

        return [token, null]
    } catch (err) {
        console.log(`[ERROR] fetchWorkspaceToken:`, err)
        return [null, err.message]
    }
}

export const findChannel = async workspaceToken => {
    try {
        const response = await fetchData(api.findChannel, {
            method: 'POST',
            credentials: 'include',
            data: createFormData({
                [env.workspaceToken]: workspaceToken,
                types: 'public_channel,private_channel',
            }),
        })
        console.log(response)
        const channels = response.channels.map(channel => ({
            id: channel.id,
            name: channel.name,
        }))

        return [channels, null]
    } catch (err) {
        console.log(`[ERROR] findChannel:`, err.message)
        return [null, err.message]
    }
}

export const fetchMessage = async () => {
    try {
        const response = await fetchData(api.fetchHistory, {
            method: 'POST',
            credentials: 'include',
            data: createFormData({
                [env.workspaceToken]: localStorage.getItem(env.workspaceToken),
                [env.workspaceChannel]: localStorage.getItem(env.workspaceChannel),
            }),
        })

        return [formatMessage(response.messages), null]
    } catch (err) {
        console.log(`[ERROR] fetchMessage:`, err.message)
        return [null, err.message]
    }
}

const formatMessage = messages => {
    const filteredData = messages.filter(message => message.files?.[0].filetype === 'pdf')
    const schedules = filteredData.map(item => {
        const texts = item.text.replaceAll(/<https:\/\/(.+)>/g, '*$&*').split('*')
        const schedule = formatWeekSchedule(texts)
        return {
            ...schedule,
            pdf: item.files[0].url_private,
        }
    })
    return schedules
}

const roomMap = [
    {
        room: 1,
        floor: 2,
        address: 'Training Room 1, Unit 01A-B, 2/F, Millennium Trade Centre, 56 Kwai Cheong Road, Kwai Chung, N.T.',
    },
    {
        room: 2,
        floor: 2,
        address: 'Training Room 2, Unit 01A-B, 2/F, Millennium Trade Centre, 56 Kwai Cheong Road, Kwai Chung, N.T.',
    },
    {
        room: 3,
        floor: 7,
        address: 'Classroom, Unit 03, 7/F, Millennium Trade Centre, 56 Kwai Cheong Road, Kwai Chung, N.T.',
    },
]

const formatWeekSchedule = elements => {
    let data = {
        week: '',
        schedule: [],
    }
    // data mapping flag
    let dateFlag = -1
    let timeFlag = ''

    elements.forEach((elem, index) => {
        elem.split('\n').forEach(exactElem => {
            // dont ask why need forEach, slack is suck
            try {
                const text = exactElem
                const textLow = text.toLowerCase()
                if (!text) return

                // week
                const week = text.match(/Week (\d+)/)
                if (!!week) {
                    data.week = Number(week[1])
                    return
                }

                // date
                const date = text.match(/\d{1,2} [A-Za-z]{3} \([A-Za-z]{3,4}\)/)
                if (!!date) {
                    dateFlag++
                    timeFlag = ''
                    const [day, month] = date[0].split(' ')
                    data.schedule[dateFlag] = {
                        date: date[0],
                        day,
                        month,
                    }
                    return
                }

                /* handle date data */
                // holiday
                if (textLow.search('public holiday') > -1) {
                    data.schedule[dateFlag] = {
                        ...data.schedule[dateFlag],
                        holiday: true,
                    }
                    return
                }

                // teams link url
                if (text.search('https://') > -1) {
                    const link = text.replaceAll(/<|>/g, '').split('|')
                    data.schedule[dateFlag] = {
                        ...data.schedule[dateFlag],
                        [timeFlag]: {
                            ...data.schedule[dateFlag][timeFlag],
                            // link: elem.url,
                            link: link[0],
                        },
                    }
                    return
                }

                // teams link text
                const time = text.match(/AM|PM/)
                if (time) {
                    timeFlag = time[0].toLowerCase()
                }
                if (textLow.search('teams') > -1) {
                    const [head, remark] = text
                        .replace(/AM|PM/, '')
                        .replace(/Teams Link|Teams/, '{cut}')
                        .split('{cut}')
                    const [, name] = head.match(/\s*(\w+)/)

                    // check timeFlag for online
                    timeFlag = !!timeFlag ? timeFlag : 'both'

                    data.schedule[dateFlag] = {
                        ...data.schedule[dateFlag],
                        [timeFlag]: {
                            name,
                            remark: remark.replace(':', '').trim(),
                            link: '',
                            isOnline: true,
                        },
                    }
                    return
                }

                // room
                const address = roomMap.find(item => item.address === text)
                if (!!address) {
                    // check timeFlag for in-person
                    timeFlag = !!timeFlag ? timeFlag : 'both'

                    data.schedule[dateFlag] = {
                        ...data.schedule[dateFlag],
                        [timeFlag]: {
                            ...address,
                            isOnline: false,
                        },
                    }
                    return
                }
            } catch (err) {
                console.log(`[ERROR] formatWeekSchedule: ${index}`, err.message)
            }
        })
    })
    return data
}

/*
 * Helper
 */
export const fetchData = async (...arg) => {
    try {
        let response = await axios(...arg)
        response = response.data

        if (!response.ok) {
            throw new Error(response.error)
        }
        return response
    } catch (err) {
        return null
    }
}

const createFormData = objectData => {
    const formData = new FormData()
    for (const key in objectData) {
        formData.append(key, objectData[key])
    }
    return formData
}
