import React from 'react';
import web3 from './web3';
import lottery from './lottery';

function Item(props) {
    
    const { onBid } = props;
    return (
        <div className='card'>
            <div className='card-body'>
                <h4 className='card-title'>{props.name}</h4>  
            </div>
            <img className='card-img-top img' src={props.src} alt={props.name}/>
            <div className='card-footer'>
                <button onClick={props.onBid} className='round-btn' disabled={props.disabled}>Bid</button>
                <div className='card-text'>{props.playersInItem}</div> 
            </div>
        </div>
    )
}
export default Item;