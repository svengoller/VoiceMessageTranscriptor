import { StyleSheet } from "react-native";

export const COLORS = {
    background: 'white',
    incomingMessage: '#6899F3',
    outgoingMessage: 'lightgrey',
    //incomingButton:  '#DBE8FF',
    button: '#F0F0F0',
    bars: '#E6E6E6',
    highlight: '#FED87A',
}

export const styles = StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: 'center',
      backgroundColor: COLORS.bars,
    },
  
    topBar: {
      flexDirection: 'row',
      justifyContent: 'flex-start', // from left to right
      alignItems: 'center', // center vertically
  
      paddingHorizontal: 10,
  
      height: 70,
      width: '100%',
      backgroundColor: COLORS.bars,

      borderBottomWidth: 0.5,
      borderBottomColor: 'grey'
    },
  
    replyTextInput: {
      backgroundColor: 'lightgrey',
      flexDirection: 'row',
      padding: 10,
  
      justifyContent: 'flex-start',
      alignItems: 'center',
    },
  
    messagesContainer: {
      flex: 1,
      backgroundColor: COLORS.background,
      padding: 5
    },
  
    groupTextContainer: {
      flex: 1,
      flexDirection: 'column',
      justifyContent: 'center',
      padding: 10,
      margin: 10,
    },
  
    voiceMessage: {
      width: '100%',
  
      flexDirection: 'row',
      justifyContent: 'flex-start',
      alignItems: 'center',
    },
    textMessage: {
      width: '80%',
  
      marginVertical: 5,
      padding: 10,
      borderRadius: 10,

      // shadowColor: 'black',
      // shadowOffset: {width: 1, height: 1},
      // shadowOpacity: 0.5,
      // shadowRadius: 1,
      // elevation: 1,


    },
    incomingMessage: {
      backgroundColor: COLORS.incomingMessage,
      alignSelf: 'flex-start'
    },
    outgoingMessage: {
      backgroundColor: COLORS.outgoingMessage,
      alignSelf: 'flex-end'
    },
  
    bottomBar: {
      flexDirection: 'row',
      justifyContent: 'flex-start',
      alignItems: 'center',
  
      paddingHorizontal: 10,
      height: 50,
      width: '100%',
  
      backgroundColor: COLORS.bars,

      borderTopWidth: 0.5,
      borderTopColor: 'grey'
    },
  
    textInput: {
      flex: 1,
  
      margin: 5,
      paddingVertical: 5,
      paddingHorizontal: 10,
  
      borderWidth: 0.5,
      borderColor: 'grey',
      backgroundColor: 'white',
      borderRadius: 20,
    },
  
    // Pressables
    summaryPressable: {
      flexGrow: 0,
      flexDirection: 'row',
      alignItems: 'center',
  
      padding: 5,
      borderRadius: 5,

      backgroundColor: COLORS.button,

      shadowColor: 'black',
      shadowOffset: {width: 1, height: 1},
      shadowOpacity: 0.5,
      shadowRadius: 1,
      elevation: 5,
    },

    highlighedPressables: {
      flexDirection: 'row', 
      alignItems: 'center',
      padding: 5, 
      borderRadius: 5,

      backgroundColor: COLORS.button,

      shadowColor: 'black',
      shadowOffset: {width: 1, height: 1},
      shadowOpacity: 0.5,
      shadowRadius: 1,
      elevation: 5,
    },
  
  
    // Separator
    separator: {
      flex: 1,
      height: 0.5,
      margin: 20,
      backgroundColor: 'grey',
    },
  
    // Icons
    icon: {
      padding: 10
    },
    groupIcon: {
      backgroundColor: 'grey',
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 40,  // padding + size = round
    },
    mic_rec: {
      padding: 10,
      color: 'green'
    },
  
    // Fonts
    regularFont: {
      fontSize: 15,
    },
    senderFont: {
      fontSize: 15,
      fontWeight: '500',
    },
    groupName: {
      fontSize: 17,
      fontWeight: '500',
    },
    groupParticipants: {
      fontSize: 15,
    },
  });
  