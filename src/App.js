import React, { Component } from 'react';
import { useState } from 'react';
import 'bootstrap/dist/css/bootstrap.css';
import web3 from './web3';
import lottery from './lottery';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Modal from 'react-modal';
import car from './images/car.jpg';
import phone from './images/phone.jpg';
import computer from './images/computer.jpg';
import style from './App.css';
import Item from './Item';

class App extends Component {

  constructor(props) {
    super(props);
    this.state = { 
      manager: '',
      items: [],
      playersInItem: [0, 0, 0], 
      balance: '', 
      value: '0.01', 
      message: '', 
      currentAccount: '',
      modal: {
        isOpen: false,
        winnersData: [],
      },
      newOwnerAddress: '',
      winners: [null, null, null],
      winnersHistory: [],
      btnDisabled: false,
      isManager: null,
      lott_ended: false
    };
  }

  // Δημιουργία αντικειμένου με τα ονόματα των αντικειμένων
  itemNames = {
    0: 'Car',
    1: 'Phone',
    2: 'Computer',
  };
  
  notify = (itemId) => {
    toast.success(`Someone bid on item ${this.itemNames[itemId]}`);
  }

  amIWinnerNotify = (i) => {
    toast.success(`You have won the item: ${this.itemNames[i]}`);
  }

  notWinnerNotify = () => {
    toast.success('You did not won any items');
  }

  disableFunctionality = (errorMessage) => {
    this.setState({ message: errorMessage });
    toast.error(errorMessage);
  }

  openModal = () => {
    this.setState({ modal: { isOpen: true, winnersData: this.state.modal.winnersData } });
  }
  
  closeModal = () => {
    this.setState({ modal: { isOpen: false, winnersData: this.state.modal.winnersData } });
  }

  checkIfManager = () => {
    const acc = this.state.currentAccount.toLowerCase();
    const mng = this.state.manager.toLowerCase();
    this.setState({isManager: acc === mng});
    //console.log('checkIfManager');
  }

  
  async componentDidMount() {
    try { 

      // Ελεγχος αν το Metamask είναι εγκατεστημένο
      if (typeof window.ethereum === 'undefined') {
        this.disableFunctionality('Metamask is not installed');
        return;
      }
      
      // Ελεγχος αν το Metamask είναι συνδεδεμένο
      if (!(await this.isMetamaskConnected())) {
        this.disableFunctionality('Metamask has not connected yet');
        return;
      }

      // Ελεγχος το chainId του Metamask
      const chainId = await window.ethereum.request({ method: 'eth_chainId' });
      
      if (chainId !== '0xaa36a7') {
        this.disableFunctionality('Metamask is connected to the wrong blockchain. You should connect to the testnet Sepolia.');
        return;
      }

       
      const manager = await lottery.methods.manager().call(); 
     
      
      this.setState({manager: manager});

      const events = await lottery.getPastEvents('PlayerEntered', {
        fromBlock: 0,
        toBlock: 'latest',
      });
  

      // Επεξεργασία των αποτελεσμάτων για λήψη των αντικειμένων
      const items = [];
      const playersInItem = [0, 0, 0];

      events.forEach(event => {
        const itemId = event.returnValues[0];
        playersInItem[itemId]++;
      });

      this.setState({ message: '', manager, items, playersInItem });

      

      if (!this.eventListenersSet) { 
        this.setupEventListeners(); 
        this.eventListenersSet = true; 
      } 
      try { // Επικοινωνία με το metamask 
        const currentAccount = (await window.ethereum.request({ method: 'eth_requestAccounts' }))[0]; 
        this.setState({ message: '', currentAccount });
        await this.checkIfManager();

      } catch (error) { 
        // Αν το metamask δεν έκανε accept το request 
        this.disableFunctionality('Metamask canceled the request');
      } 
    } catch (error) { 
      // Αν το metamask δεν έχει εγκατασταθεί 
      this.disableFunctionality('Metamask is not installed');
    } 
    
  } 

  isMetamaskConnected = async () => {
    const accounts = await window.ethereum.request({ method: 'eth_accounts' });
    return accounts.length > 0;
  }

  handleAccountsChanged = async (accounts) => {
    const currentAccount = accounts[0]; 
    this.setState(prevState => ({
      ...prevState,
      currentAccount,
    }), () => {
      this.checkIfManager();
    });
  }

  componentDidUpdate(prevProps, prevState) {
    if (prevState.currentAccount !== this.state.currentAccount) {
      this.checkIfManager();
    }
  }
      
  setupEventListeners() { 
    
    window.ethereum.on('accountsChanged', this.handleAccountsChanged);

    // Προσθήκη event listener για το γεγονός "PlayerEntered"
    lottery.events.PlayerEntered({ fromBlock: 'latest' }, (error, event) => {
      if (!error) {
        //const playerName = event.returnValues[1];
        
        toast.success('Test Notification', {
          position: 'top-right',
          autoClose: 5000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          progress: undefined,
        });
        
      } else {
        console.error('Error handling PlayerEntered event:', error);
      }
    });

    // Προσθήκη event listener για το γεγονός "WinnerPicked"
    /* lottery.events.WinnerPicked({ fromBlock: 'latest' }, (error, event) => {
      if (!error) {
        const winnerIndex = event.returnValues[1].toNumber();
        const winnerAddress = event.returnValues[0];
        
        const winnerData = {
          address: winnerAddress,
          itemIndex: winnerIndex,
        };
        
        this.setState(prevState => ({
          winnersHistory: [...prevState.winnersHistory, winnerData],
        }));

      } else {
        console.error('Error handling WinnerPicked event:', error);
      }
    }); */
  }

  onBid = async (event, itemId) => {
    event.preventDefault();

    const item = this.state.items[itemId];
    this.setState({ message: 'Waiting on transaction success...' });
    
    try {
      await lottery.methods.bid(itemId).send({ 
        // Κλήση της "bid()" του συμβολαίου
        from: this.state.currentAccount,
        value: web3.utils.toWei(this.state.value, 'ether')
      });

      console.log(this.state.value);
      await this.updateContractBalance();

      this.setState({ message: 'You have been entered!' });
      
      const playersInItem = [...this.state.playersInItem];
      playersInItem[itemId]++;
      
      this.setState({ playersInItem });
      
      this.notify(itemId);

    } catch (error) {
      console.error('Error during bid:', error);
      console.log('Error object:', error);
      this.setState({ message: 'Error during bid. See console for details.' });
    }
    console.log(this.state.message)
  }

  updateContractBalance = async () => {
    try {
      const balanceWei = await lottery.methods.getContractBalance().call();
      
      const balanceEther = web3.utils.fromWei(balanceWei, 'ether');
      this.setState({ balance: balanceEther });
      console.log('balance=', balanceEther );
      
    } catch (error) {
      console.error('Error updating contract balance:', error);
      this.setState({ message: 'Error updating contract balance. See console for details.' });
    }
  }

  handleWinnerPickedEvent = async () => {
    try {
        const latestEvent = await lottery.getPastEvents('WinnerPicked', {
            fromBlock: 'latest',
            toBlock: 'latest',
        });

        if (latestEvent.length > 0) {
            const event = latestEvent[0];
            const winnerIndex = parseInt(event.returnValues[1]);
            const winnerAddress = event.returnValues[0];

            const winnerData = {
                address: winnerAddress,
                itemIndex: winnerIndex,
            };

            this.setState((prevState) => ({
                winnersHistory: [...prevState.winnersHistory, winnerData],
            }));

            if (winnerAddress.toLowerCase() === this.state.currentAccount.toLowerCase()) {
              this.amIWinnerNotify(winnerIndex);
            } else {
              this.notWinnerNotify();
            }
        }
    } catch (error) {
        console.error('Error handling WinnerPicked event:', error);
    }
  };

  loadWinners = async () => {
    try {
      const winners = await lottery.methods.getWinners().call();
      const winnersData = winners.map((address, index) => ({ index, address }));
      this.setState({ modal: { isOpen: true, winnersData } });
      this.setState({ winners });

      console.log(`winners: ${winners}`);
      console.log("winnersData: ", winnersData);
      
      console.log(`winnersHistory: ${this.state.winnersHistory}`);

      if (this.state.winnersHistory === undefined) {
        this.setState({ winnersHistory: [] });
      }

      /* const newWinnersHistory = [...this.state.winnersHistory]; 

    
      winnersData.forEach((winner) => {
        newWinnersHistory.push({
          address: winner.address,
          itemIndex: winner.index
        });
      });
      */

      this.setState((prevState) => {
        const newWinnersHistory = [...(prevState.winnersHistory || [])];

        winnersData.forEach((winner) => {
          newWinnersHistory.push({
            address: winner.address,
            itemIndex: winner.index
          });
        });

        console.log("newWinnersHistory: ", newWinnersHistory);
        
        return { winnersHistory: newWinnersHistory };
      });

      this.state.winnersHistory.forEach((winner) => {
        console.log("winner: ", winner.address, winner.index);
      });

      console.log("winnersHistory 2: ", this.state.winnersHistory);
    
     

      /* this.setState(prevState => ({
        winnersHistory: [...prevState.winnersHistory, winnerData],
      })); */

      /* this.setState({ winnersHistory: newWinnersHistory }); */

      this.setState((prevState) => {
        console.log("winnersHistory: ", prevState.winnersHistory);
      });
      
      this.state.winnersHistory.forEach((winner) => {
        console.log("winner: ", winner.address, winner.index);
      })

      console.log("winnersHistory: ", this.state.winnersHistory);

      

      this.setState({ lott_ended: true });
    } catch (error) {
      console.error('Error loading winners:', error);
      this.setState({ message: 'Error loading winners. See console for details.' });
    }
  }

  declareWinner = async () => {
    try {
      await lottery.methods.pickWinner().send({
        from: this.state.currentAccount,
      });
      console.log('in declare winner try');
      
      this.loadWinners();

    } catch (error) {
      console.error('Error declaring winner:', error);
      this.setState({ message: 'Error declaring winner. See console for details.' });
    }
    console.log('getting out of declare winner');

  }

  displayWinners = () => {
    const { winnersData } = this.state.modal;
    return winnersData.map((winner, index) => (
      <div key={index} className='winners_container'>
        <div className='winner'>
          <div className='winner_item'>
            Item earned:&nbsp;&nbsp;
            <span className='index'>{this.itemNames[index]}</span>
          </div>
          <div className='winner_address'>
            Winner's Address:&nbsp;&nbsp;
            <span className='index'>{winner.address}</span>
          </div>
        </div>
      </div>
    ));
  }

  withdraw = async () => {
    try {
      await lottery.methods.withdraw().send({
        from: this.state.currentAccount,
      });

      await this.updateContractBalance();
    } catch (error) {
      console.error('Error withdraw:', error);
      this.setState({ message: 'Error withdraw. See console for details.' });
    }
    console.log('withdraw');
  }

  amIWinner = () => {
    const { currentAccount, winnersHistory  } = this.state;

    const stringAccount = currentAccount.toLowerCase();

    const userWins = winnersHistory.filter(
      (win) => win.address.toLowerCase() === stringAccount
    );
    
    console.log(`this.state.winnersHistory ${this.state.winnersHistory}`);
    console.log(`userWins ${userWins}`);

    if (userWins.length === 0) {
      this.notWinnerNotify();
      console.log('You did not won any items');
      return 0;
    } else {
      // Εμφανίζει τον αριθμό του αντικειμένου που κέρδισε ο χρήστης


      console.log('You won item:', userWins.map((win) => win.itemIndex + 1));

      userWins.forEach((win) => {
        this.amIWinnerNotify(win.itemIndex)
      });

      return (userWins.map((win) => win.itemIndex + 1));
    }

  };
    

  startNewRound = async () =>  {
    try {
      await lottery.methods.startNewRound().send({
        from: this.state.currentAccount,
      });
      console.log('New round started successfully.');
      console.log(`winners: ${this.state.winners}`);
      this.setState({playersInItem: [0,0,0]});
      this.setState({winners: [null,null,null]});
      this.setState({lott_ended: false});
      console.log(`winners: ${this.state.winners}`);

    } catch (error) {
      console.error('Error starting new round:', error);
      this.setState({ message: 'Error starting new round. See console for details.' });
    }
  };

  transferOwnership = async (newOwner) => {
    try {
      await lottery.methods.transferOwnership(newOwner).send({
        from: this.state.currentAccount,
      });

      this.setState({manager: newOwner});

  
      console.log('Ownership transferred successfully. New owner = ', newOwner);
    } catch (error) {
      console.error('Error transferring ownership:', error);
      this.setState({ message: 'Error transferring ownership. See console for details.' });
    }
  }

  destroyContract = async () => {
    try {
      await lottery.methods.destroy().send({
        from: this.state.currentAccount,
      });
  
      // Αφού κληθεί η μέθοδος destroy στο smart contract, μπορείτε να εκτελέσετε κώδικα εδώ αν χρειάζεται
      console.log('Contract destroyed successfully.');
    } catch (error) {
      console.error('Error destroying contract:', error);
      this.setState({ message: 'Error destroying contract. See console for details.' });
    }
  };
  
  render() {

    return (
      <div>
        <ToastContainer />
        <Modal
          isOpen={this.state.modal.isOpen}
          onRequestClose={this.closeModal}
          contentLabel="Winners Modal"
        >
          <div className='modal_header'>
            <h2>Winners</h2>
            <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close" onClick={this.closeModal}></button>
          </div>
          {/* <button onClick={this.closeModal}>Close</button> */}
          {this.displayWinners()}
        </Modal>
        <h1>Lottery-Ballot</h1>
        <div className='card-group'>
          <Item id='0' name={this.itemNames[0]} src={car} playersInItem={this.state.playersInItem[0]} onBid={(event) => this.onBid(event, 0)} disabled = {this.state.isManager || this.state.lott_ended}/>
          <Item id='1' name={this.itemNames[1]} src={phone} playersInItem={this.state.playersInItem[1]} onBid={(event) => this.onBid(event, 1)} disabled = {this.state.isManager || this.state.lott_ended}/>
          <Item id='2' name={this.itemNames[2]} src={computer} playersInItem={this.state.playersInItem[2]} onBid={(event) => this.onBid(event, 2)} disabled = {this.state.isManager || this.state.lott_ended}/>
        </div>
        <div className='accounts_wrap'>
          <div>
            <div>Current account: </div>
            <div className='account'>{this.state.currentAccount}</div>
          </div>
          <div>
            <div>Owner's account: </div>
            <div className='account'>{this.state.manager}</div>
          </div>
        </div>
        <div className='contract-balance mrg-20'>
          <span>Contract Balance:&nbsp;</span>
          <span className='balance'>{this.state.balance} Ether</span>
        </div>

        <div className='buttons_wrap'>
          
          <button className='mybtn item-a' onClick={() => this.withdraw()} disabled = {!this.state.isManager}>Withdraw</button>
          
          <button className='mybtn item-b' disabled = {true} >Reveal</button>
          
          <button className='mybtn item-c' onClick={() => this.declareWinner() } disabled = {!this.state.isManager}>Declare Winner</button>
          
          <button className='mybtn item-d' onClick={() => console.log(`Am I Winner? ${this.amIWinner()}`)}>Am I Winner</button>
          
          <button className='mybtn item-e' onClick={() => this.startNewRound()} disabled = {!this.state.isManager}>Start New Round</button>
          
          <div className='transfer-ownership item-f'>
            <input 
              type='text' 
              placeholder='New Owner Address' 
              value={this.state.newOwnerAddress} 
              onChange={(event) => this.setState({ newOwnerAddress: event.target.value })} 
            />
            <button className='mybtn input-btn' onClick={() => this.transferOwnership(this.state.newOwnerAddress)}disabled = {!this.state.isManager}>
              Transfer Ownership
            </button>
          </div>

          <button className='mybtn btn-red item-g' onClick={() => this.destroyContract()} disabled = {!this.state.isManager}>
              Destroy Contract
          </button>
          
        </div>
    </div>
      
    );
  }

}

 
export default App;
