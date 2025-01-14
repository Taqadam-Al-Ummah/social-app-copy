import 'react-native-url-polyfill/auto'
import 'lib/sentry' // must be near top

import React, {useState, useEffect} from 'react'
import {RootSiblingParent} from 'react-native-root-siblings'
import * as SplashScreen from 'expo-splash-screen'
import {GestureHandlerRootView} from 'react-native-gesture-handler'
import {QueryClientProvider} from '@tanstack/react-query'
import {enableFreeze} from 'react-native-screens'

import 'view/icons'

import {init as initPersistedState} from '#/state/persisted'
import {init as initReminders} from '#/state/shell/reminders'
import {listenSessionDropped} from './state/events'
import {useColorMode} from 'state/shell'
import {ThemeProvider} from 'lib/ThemeContext'
import {s} from 'lib/styles'
import {Shell} from 'view/shell'
import * as notifications from 'lib/notifications/notifications'
import * as analytics from 'lib/analytics/analytics'
import * as Toast from 'view/com/util/Toast'
import {queryClient} from 'lib/react-query'
import {TestCtrls} from 'view/com/testing/TestCtrls'
import {Provider as ShellStateProvider} from 'state/shell'
import {Provider as ModalStateProvider} from 'state/modals'
import {Provider as LightboxStateProvider} from 'state/lightbox'
import {Provider as MutedThreadsProvider} from 'state/muted-threads'
import {Provider as InvitesStateProvider} from 'state/invites'
import {Provider as PrefsStateProvider} from 'state/preferences'
import {
  Provider as SessionProvider,
  useSession,
  useSessionApi,
} from 'state/session'
import {Provider as UnreadNotifsProvider} from 'state/queries/notifications/unread'
import * as persisted from '#/state/persisted'
import {i18n} from '@lingui/core'
import {I18nProvider} from '@lingui/react'
import {messages} from './locale/locales/en/messages'
i18n.load('en', messages)
i18n.activate('en')

enableFreeze(true)
SplashScreen.preventAutoHideAsync()

function InnerApp() {
  const colorMode = useColorMode()
  const {isInitialLoad} = useSession()
  const {resumeSession} = useSessionApi()

  // init
  useEffect(() => {
    initReminders()
    analytics.init()
    notifications.init(queryClient)
    listenSessionDropped(() => {
      Toast.show('Sorry! Your session expired. Please log in again.')
    })

    const account = persisted.get('session').currentAccount
    resumeSession(account)
  }, [resumeSession])

  // show nothing prior to init
  if (isInitialLoad) {
    // TODO add a loading state
    return null
  }

  /*
   * Session and initial state should be loaded prior to rendering below.
   */

  return (
    <UnreadNotifsProvider>
      <ThemeProvider theme={colorMode}>
        <analytics.Provider>
          <I18nProvider i18n={i18n}>
            {/* All components should be within this provider */}
            <RootSiblingParent>
              <GestureHandlerRootView style={s.h100pct}>
                <TestCtrls />
                <Shell />
              </GestureHandlerRootView>
            </RootSiblingParent>
          </I18nProvider>
        </analytics.Provider>
      </ThemeProvider>
    </UnreadNotifsProvider>
  )
}

function App() {
  const [isReady, setReady] = useState(false)

  React.useEffect(() => {
    initPersistedState().then(() => setReady(true))
  }, [])

  if (!isReady) {
    return null
  }

  /*
   * NOTE: only nothing here can depend on other data or session state, since
   * that is set up in the InnerApp component above.
   */
  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <ShellStateProvider>
          <PrefsStateProvider>
            <MutedThreadsProvider>
              <InvitesStateProvider>
                <ModalStateProvider>
                  <LightboxStateProvider>
                    <InnerApp />
                  </LightboxStateProvider>
                </ModalStateProvider>
              </InvitesStateProvider>
            </MutedThreadsProvider>
          </PrefsStateProvider>
        </ShellStateProvider>
      </SessionProvider>
    </QueryClientProvider>
  )
}

export default App
